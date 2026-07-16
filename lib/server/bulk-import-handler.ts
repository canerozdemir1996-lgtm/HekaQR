import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { CreateBulkImportInput } from "@/lib/schemas/validationSchemas";
import {
  canManageBulkImportForOrganization,
  canUseBulkImportFolder,
  canUseBulkImportStyle,
  type BulkFolderAccess,
  type BulkOrganizationMembership,
  type BulkStyleAccess,
} from "@/lib/server/bulk-import-access";

export type BulkImportPayload = Omit<CreateBulkImportInput, "qr_mode"> & {
  qr_mode?: "static" | "dynamic";
};

type DbError = { message: string; code?: string };
type DbResult<T> = Promise<{ data: T | null; error: DbError | null }>;
type ExistingBatch = Record<string, unknown> & { payload_hash: string };
type CreatedBatch = Record<string, unknown> & { id: string };

type ValidationResult =
  | { valid: true; data: BulkImportPayload }
  | { valid: false; error: Error & { details?: unknown } };

export type BulkImportPostDependencies = {
  authenticate: (request: NextRequest) => Promise<{ userId: string } | null>;
  validate: (request: NextRequest) => Promise<ValidationResult>;
  findExisting: (userId: string, idempotencyKeyHash: string) => DbResult<ExistingBatch>;
  getPlan: (userId: string) => Promise<{ limits: { max_bulk_qr_per_month: number | null } }>;
  canAccessBulk: (userId: string) => Promise<boolean>;
  findFolder: (folderId: string) => DbResult<BulkFolderAccess>;
  findMembership: (organizationId: string, userId: string) => DbResult<BulkOrganizationMembership>;
  findStyle: (styleId: string) => DbResult<BulkStyleAccess>;
  insertBatch: (record: Record<string, unknown>) => DbResult<CreatedBatch>;
  insertRows: (records: Record<string, unknown>[]) => Promise<{ error: DbError | null }>;
  deleteBatch: (batchId: string, userId: string) => Promise<void>;
  safeDbError: (error: DbError, context: string, fallback?: string) => string;
  now?: () => string;
};

export type BulkImportGetDependencies = {
  authenticate: (request: NextRequest) => Promise<{ userId: string } | null>;
  listImports: (userId: string, limit: number) => Promise<{ data: Record<string, unknown>[] | null; error: DbError | null }>;
  safeDbError: (error: DbError, context: string, fallback?: string) => string;
};

export function hashBulkImportValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function withoutPayloadHash(batch: ExistingBatch) {
  const { payload_hash: _payloadHash, ...publicBatch } = batch;
  return publicBatch;
}

export function createBulkImportGetHandler(dependencies: BulkImportGetDependencies) {
  return async function bulkImportGet(request: NextRequest) {
    const auth = await dependencies.authenticate(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
    const result = await dependencies.listImports(auth.userId, limit);
    if (result.error) {
      return NextResponse.json({
        error: dependencies.safeDbError(result.error, "imports.GET", "İçe aktarma geçmişi yüklenemedi."),
      }, { status: 500 });
    }
    return NextResponse.json({ imports: result.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  };
}

export function createBulkImportPostHandler(dependencies: BulkImportPostDependencies) {
  return async function bulkImportPost(request: NextRequest) {
    const auth = await dependencies.authenticate(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const idempotencyKey = (request.headers.get("idempotency-key") ?? "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return NextResponse.json({ error: "8-128 karakterlik Idempotency-Key başlığı gerekli." }, { status: 400 });
    }

    const validation = await dependencies.validate(request);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details ?? null }, { status: 400 });
    }

    const payload = validation.data;
    const idempotencyKeyHash = hashBulkImportValue(idempotencyKey);
    const payloadHash = hashBulkImportValue(JSON.stringify(payload));
    const existingResult = await dependencies.findExisting(auth.userId, idempotencyKeyHash);
    if (existingResult.error) {
      return NextResponse.json({ error: dependencies.safeDbError(existingResult.error, "imports.POST.idempotency") }, { status: 500 });
    }
    if (existingResult.data) {
      if (existingResult.data.payload_hash !== payloadHash) {
        return NextResponse.json({ error: "Bu Idempotency-Key farklı bir içe aktarma isteğinde kullanılmış." }, { status: 409 });
      }
      return NextResponse.json({ import: withoutPayloadHash(existingResult.data), idempotent_replay: true }, { status: 200 });
    }

    const planInfo = await dependencies.getPlan(auth.userId);
    if (!(await dependencies.canAccessBulk(auth.userId))) {
      return NextResponse.json({ error: "Toplu QR oluşturma mevcut planınızda yok.", code: "BULK_ACCESS_DENIED", plan_info: planInfo }, { status: 402 });
    }
    const monthlyLimit = planInfo.limits.max_bulk_qr_per_month;
    if (monthlyLimit !== null && payload.rows.length > monthlyLimit) {
      return NextResponse.json({
        error: `Tek dosyadaki ${payload.rows.length} satır, planınızın aylık ${monthlyLimit} QR sınırını aşıyor.`,
        code: "BULK_MONTHLY_LIMIT_REACHED",
        plan_info: planInfo,
      }, { status: 402 });
    }

    if (payload.folder_id) {
      const folderResult = await dependencies.findFolder(payload.folder_id);
      if (folderResult.error) {
        return NextResponse.json({ error: dependencies.safeDbError(folderResult.error, "imports.POST.folder") }, { status: 500 });
      }
      if (!canUseBulkImportFolder(folderResult.data, auth.userId)) {
        return NextResponse.json({ error: "Seçilen klasöre erişiminiz yok." }, { status: 403 });
      }
    }

    if (payload.organization_id) {
      const membershipResult = await dependencies.findMembership(payload.organization_id, auth.userId);
      if (membershipResult.error) {
        return NextResponse.json({ error: dependencies.safeDbError(membershipResult.error, "imports.POST.organization") }, { status: 500 });
      }
      if (!canManageBulkImportForOrganization(membershipResult.data)) {
        return NextResponse.json({ error: "Bu organizasyonda toplu QR oluşturma yetkiniz yok." }, { status: 403 });
      }
    }

    if (payload.style_id) {
      const styleResult = await dependencies.findStyle(payload.style_id);
      if (styleResult.error) {
        return NextResponse.json({ error: dependencies.safeDbError(styleResult.error, "imports.POST.style") }, { status: 500 });
      }
      if (!canUseBulkImportStyle(styleResult.data, auth.userId)) {
        return NextResponse.json({ error: "Seçilen QR şablonuna erişiminiz yok." }, { status: 403 });
      }
    }

    const now = dependencies.now?.() ?? new Date().toISOString();
    const batchResult = await dependencies.insertBatch({
      user_id: auth.userId,
      organization_id: payload.organization_id ?? null,
      folder_id: payload.folder_id ?? null,
      style_id: payload.style_id ?? null,
      name: payload.name,
      source_file_name: payload.source_file_name ?? null,
      source_format: payload.source_format,
      qr_mode: payload.qr_mode ?? "dynamic",
      status: "ready",
      idempotency_key_hash: idempotencyKeyHash,
      payload_hash: payloadHash,
      total_rows: payload.rows.length,
      valid_rows: payload.rows.length,
      updated_at: now,
    });

    if (batchResult.error || !batchResult.data) {
      if (batchResult.error?.code === "23505") {
        const racedResult = await dependencies.findExisting(auth.userId, idempotencyKeyHash);
        if (racedResult.data?.payload_hash === payloadHash) {
          return NextResponse.json({ import: withoutPayloadHash(racedResult.data), idempotent_replay: true }, { status: 200 });
        }
      }
      const error = batchResult.error ?? { message: "Batch insert returned no row." };
      return NextResponse.json({
        error: dependencies.safeDbError(error, "imports.POST.batch", "İçe aktarma kaydı oluşturulamadı."),
      }, { status: 500 });
    }

    const rowRecords = payload.rows.map(row => ({
      batch_id: batchResult.data!.id,
      user_id: auth.userId,
      row_number: row.source_row,
      input_payload: row,
      normalized_payload: row,
      payload_hash: hashBulkImportValue(JSON.stringify(row)),
      status: "pending",
      updated_at: now,
    }));
    const rowsResult = await dependencies.insertRows(rowRecords);
    if (rowsResult.error) {
      await dependencies.deleteBatch(batchResult.data.id, auth.userId);
      return NextResponse.json({
        error: dependencies.safeDbError(rowsResult.error, "imports.POST.rows", "İçe aktarma satırları kaydedilemedi."),
      }, { status: 500 });
    }

    return NextResponse.json({ import: batchResult.data, idempotent_replay: false }, { status: 201 });
  };
}

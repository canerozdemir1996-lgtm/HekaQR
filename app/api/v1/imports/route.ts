import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { canAccessFeature, getUserPlan } from "@/lib/check-plan";
import { validateRequestBody } from "@/lib/middleware/validation";
import { createBulkImportSchema } from "@/lib/schemas/validationSchemas";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import {
  canManageBulkImportForOrganization,
  canUseBulkImportFolder,
  canUseBulkImportStyle,
} from "@/lib/server/bulk-import-access";

export const dynamic = "force-dynamic";

const BATCH_COLUMNS = "id,name,source_file_name,source_format,qr_mode,status,total_rows,valid_rows,created_rows,failed_rows,skipped_rows,current_row,last_error,organization_id,folder_id,style_id,started_at,finished_at,created_at,updated_at";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function findExisting(userId: string, idempotencyKeyHash: string) {
  return sbAdmin()
    .from("qr_import_batches")
    .select(`${BATCH_COLUMNS},payload_hash`)
    .eq("user_id", userId)
    .eq("idempotency_key_hash", idempotencyKeyHash)
    .maybeSingle();
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
  const { data, error } = await sbAdmin()
    .from("qr_import_batches")
    .select(BATCH_COLUMNS)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: safeDbErrorMessage(error, "imports.GET", "İçe aktarma geçmişi yüklenemedi.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ imports: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idempotencyKey = (req.headers.get("idempotency-key") ?? "").trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json({ error: "8-128 karakterlik Idempotency-Key başlığı gerekli." }, { status: 400 });
  }

  const validation = await validateRequestBody(req, createBulkImportSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error.message, details: (validation.error as Error & { details?: unknown }).details ?? null },
      { status: 400 },
    );
  }
  const payload = validation.data;
  const idempotencyKeyHash = sha256(idempotencyKey);
  const payloadHash = sha256(JSON.stringify(payload));

  const { data: existing, error: existingError } = await findExisting(auth.userId, idempotencyKeyHash);
  if (existingError) {
    return NextResponse.json({ error: safeDbErrorMessage(existingError, "imports.POST.idempotency") }, { status: 500 });
  }
  if (existing) {
    if (existing.payload_hash !== payloadHash) {
      return NextResponse.json({ error: "Bu Idempotency-Key farklı bir içe aktarma isteğinde kullanılmış." }, { status: 409 });
    }
    const { payload_hash: _payloadHash, ...batch } = existing;
    return NextResponse.json({ import: batch, idempotent_replay: true }, { status: 200 });
  }

  const planInfo = await getUserPlan(auth.userId);
  if (!(await canAccessFeature(auth.userId, "bulk_upload"))) {
    return NextResponse.json({ error: "Toplu QR oluşturma mevcut planınızda yok.", code: "BULK_ACCESS_DENIED", plan_info: planInfo }, { status: 402 });
  }
  if (planInfo.limits.max_bulk_qr_per_month !== null && payload.rows.length > planInfo.limits.max_bulk_qr_per_month) {
    return NextResponse.json({
      error: `Tek dosyadaki ${payload.rows.length} satır, planınızın aylık ${planInfo.limits.max_bulk_qr_per_month} QR sınırını aşıyor.`,
      code: "BULK_MONTHLY_LIMIT_REACHED",
      plan_info: planInfo,
    }, { status: 402 });
  }

  const sb = sbAdmin();
  if (payload.folder_id) {
    const { data: folder, error: folderError } = await sb
      .from("qr_folders")
      .select("id,user_id")
      .eq("id", payload.folder_id)
      .maybeSingle();
    if (folderError) return NextResponse.json({ error: safeDbErrorMessage(folderError, "imports.POST.folder") }, { status: 500 });
    if (!canUseBulkImportFolder(folder, auth.userId)) return NextResponse.json({ error: "Seçilen klasöre erişiminiz yok." }, { status: 403 });
  }

  if (payload.organization_id) {
    const { data: membership, error: membershipError } = await sb
      .from("organization_members")
      .select("role,status")
      .eq("org_id", payload.organization_id)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (membershipError) return NextResponse.json({ error: safeDbErrorMessage(membershipError, "imports.POST.organization") }, { status: 500 });
    if (!canManageBulkImportForOrganization(membership)) {
      return NextResponse.json({ error: "Bu organizasyonda toplu QR oluşturma yetkiniz yok." }, { status: 403 });
    }
  }

  if (payload.style_id) {
    const { data: style, error: styleError } = await sb
      .from("qr_styles")
      .select("id,user_id,visibility")
      .eq("id", payload.style_id)
      .maybeSingle();
    if (styleError) return NextResponse.json({ error: safeDbErrorMessage(styleError, "imports.POST.style") }, { status: 500 });
    if (!canUseBulkImportStyle(style, auth.userId)) return NextResponse.json({ error: "Seçilen QR şablonuna erişiminiz yok." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: batch, error: batchError } = await sb
    .from("qr_import_batches")
    .insert({
      user_id: auth.userId,
      organization_id: payload.organization_id ?? null,
      folder_id: payload.folder_id ?? null,
      style_id: payload.style_id ?? null,
      name: payload.name,
      source_file_name: payload.source_file_name ?? null,
      source_format: payload.source_format,
      qr_mode: payload.qr_mode,
      status: "ready",
      idempotency_key_hash: idempotencyKeyHash,
      payload_hash: payloadHash,
      total_rows: payload.rows.length,
      valid_rows: payload.rows.length,
      updated_at: now,
    })
    .select(BATCH_COLUMNS)
    .single();

  if (batchError) {
    if (batchError.code === "23505") {
      const { data: raced } = await findExisting(auth.userId, idempotencyKeyHash);
      if (raced?.payload_hash === payloadHash) {
        const { payload_hash: _payloadHash, ...replayed } = raced;
        return NextResponse.json({ import: replayed, idempotent_replay: true }, { status: 200 });
      }
    }
    return NextResponse.json({ error: safeDbErrorMessage(batchError, "imports.POST.batch", "İçe aktarma kaydı oluşturulamadı.") }, { status: 500 });
  }

  const rowRecords = payload.rows.map((row) => ({
    batch_id: batch.id,
    user_id: auth.userId,
    row_number: row.source_row,
    input_payload: row,
    normalized_payload: row,
    payload_hash: sha256(JSON.stringify(row)),
    status: "pending",
    updated_at: now,
  }));
  const { error: rowsError } = await sb.from("qr_import_rows").insert(rowRecords);
  if (rowsError) {
    await sb.from("qr_import_batches").delete().eq("id", batch.id).eq("user_id", auth.userId);
    return NextResponse.json({ error: safeDbErrorMessage(rowsError, "imports.POST.rows", "İçe aktarma satırları kaydedilemedi.") }, { status: 500 });
  }

  return NextResponse.json({ import: batch, idempotent_replay: false }, { status: 201 });
}

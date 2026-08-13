import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { POST as createQrCode } from "@/app/api/v1/qrcodes/route";
import { buildBulkQrPayload, bulkImportSlug } from "@/lib/bulk-qr-payload";
import type { BulkRow } from "@/lib/bulk-import";
import { summarizeImportProgress, type ImportProgressRow } from "@/lib/bulk-import-progress";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { authRequest, routeParams, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { createImportDispatchToken } from "@/lib/server/import-dispatch-auth";
import { IMPORT_HEADERS } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const processSchema = z.object({
  limit: z.number().int().min(1).max(50).default(25),
  retry_failed: z.boolean().default(false),
  retry_run_id: z.string().uuid().optional().nullable(),
}).superRefine((value, context) => {
  if (value.retry_failed && !value.retry_run_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["retry_run_id"], message: "Retry run id gerekli." });
  }
});

type ClaimedRow = {
  id: string;
  row_number: number;
  normalized_payload: BulkRow;
};

async function summarizeBatch(batchId: string, userId: string, retryRunId?: string | null) {
  const sb = sbAdmin();
  const { data: rows, error } = await sb
    .from("qr_import_rows")
    .select("status,row_number,last_retry_run_id")
    .eq("batch_id", batchId)
    .eq("user_id", userId);
  if (error) throw error;

  const progress = summarizeImportProgress((rows ?? []) as ImportProgressRow[], retryRunId);
  const now = new Date().toISOString();
  const { data: batch, error: updateError } = await sb
    .from("qr_import_batches")
    .update({
      status: progress.status,
      created_rows: progress.counts.created,
      failed_rows: progress.counts.failed,
      skipped_rows: progress.counts.skipped,
      current_row: progress.currentRow,
      finished_at: progress.remaining === 0 ? now : null,
      updated_at: now,
    })
    .eq("id", batchId)
    .eq("user_id", userId)
    .select("id,name,status,total_rows,valid_rows,created_rows,failed_rows,skipped_rows,current_row,last_error,created_at,updated_at,started_at,finished_at")
    .single();
  if (updateError) throw updateError;
  return { batch, remaining: progress.remaining, retryable_failed: progress.retryableFailed };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await routeParams(context);

  const parsedBody = processSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Geçersiz işleme seçenekleri.", details: parsedBody.error.flatten() }, { status: 400 });
  }

  const sb = sbAdmin();
  const { data: batch, error: batchError } = await sb
    .from("qr_import_batches")
    .select("id,user_id,status,qr_mode,style_id,folder_id,organization_id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (batchError) return NextResponse.json({ error: safeDbErrorMessage(batchError, "imports.process.batch") }, { status: 500 });
  if (!batch) return NextResponse.json({ error: "İçe aktarma kaydı bulunamadı." }, { status: 404 });
  if (batch.status === "cancelled") return NextResponse.json({ error: "İptal edilmiş içe aktarma işlenemez." }, { status: 409 });

  const { data: claimed, error: claimError } = await sb.rpc("claim_qr_import_rows", {
    p_batch_id: id,
    p_user_id: auth.userId,
    p_limit: parsedBody.data.limit,
    p_retry_failed: parsedBody.data.retry_failed,
    p_retry_run_id: parsedBody.data.retry_run_id ?? null,
  });
  if (claimError) return NextResponse.json({ error: safeDbErrorMessage(claimError, "imports.process.claim", "İçe aktarma satırları işleme alınamadı.") }, { status: 500 });

  const results: { row: number; status: "created" | "failed"; qr_code_id?: string; error?: string }[] = [];
  const publicOrigin = getPublicAppOrigin(req.nextUrl.origin);

  for (const claimedRow of (claimed ?? []) as ClaimedRow[]) {
    const slug = bulkImportSlug(id, claimedRow.row_number);
    try {
      const { data: existingQr } = await sb
        .from("qr_codes")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("short_slug", slug)
        .maybeSingle();

      let qrCodeId = existingQr?.id as string | undefined;
      if (!qrCodeId) {
        const payload = buildBulkQrPayload(claimedRow.normalized_payload, {
          batchId: id,
          rowNumber: claimedRow.row_number,
          publicOrigin,
          qrMode: batch.qr_mode === "static" ? "static" : "dynamic",
          styleId: batch.style_id,
          folderId: batch.folder_id,
          organizationId: batch.organization_id,
        });
        const headers = new Headers(req.headers);
        headers.delete("content-length");
        headers.set("content-type", "application/json");
        headers.set(IMPORT_HEADERS.bulkCreate, "1");
        headers.set(IMPORT_HEADERS.batch, id);
        headers.set(IMPORT_HEADERS.row, String(claimedRow.row_number));
        headers.set(IMPORT_HEADERS.token, createImportDispatchToken(id, claimedRow.row_number, auth.userId));
        const internalRequest = new NextRequest(new URL("/api/v1/qrcodes", req.url), {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const response = await createQrCode(internalRequest);
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.qrcode?.id) {
          throw Object.assign(new Error(typeof body?.error === "string" ? body.error : "QR oluşturulamadı."), {
            code: typeof body?.code === "string" ? body.code : `HTTP_${response.status}`,
          });
        }
        qrCodeId = body.qrcode.id as string;
      }

      const { error: rowError } = await sb
        .from("qr_import_rows")
        .update({ status: "created", qr_code_id: qrCodeId, error_code: null, error_message: null, updated_at: new Date().toISOString() })
        .eq("id", claimedRow.id)
        .eq("batch_id", id)
        .eq("user_id", auth.userId);
      if (rowError) throw rowError;
      results.push({ row: claimedRow.row_number, status: "created", qr_code_id: qrCodeId });
    } catch (error) {
      const caught = error as Error & { code?: string };
      const message = caught.message.slice(0, 500);
      await sb
        .from("qr_import_rows")
        .update({
          status: "failed",
          error_code: caught.code ?? "CREATE_FAILED",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimedRow.id)
        .eq("batch_id", id)
        .eq("user_id", auth.userId);
      results.push({ row: claimedRow.row_number, status: "failed", error: message });
    }
  }

  try {
    const summary = await summarizeBatch(id, auth.userId, parsedBody.data.retry_run_id);
    return NextResponse.json({ ...summary, processed: results });
  } catch (error) {
    return NextResponse.json({
      error: safeDbErrorMessage(error as { message: string; code?: string }, "imports.process.summary", "Satırlar işlendi ancak özet güncellenemedi."),
      processed: results,
    }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { canAccessFeature, getUserPlan } from "@/lib/check-plan";
import { validateRequestBody } from "@/lib/middleware/validation";
import { createBulkImportSchema } from "@/lib/schemas/validationSchemas";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { createBulkImportGetHandler, createBulkImportPostHandler } from "@/lib/server/bulk-import-handler";

export const dynamic = "force-dynamic";

const BATCH_COLUMNS = "id,name,source_file_name,source_format,qr_mode,status,total_rows,valid_rows,created_rows,failed_rows,skipped_rows,current_row,last_error,organization_id,folder_id,style_id,started_at,finished_at,created_at,updated_at";

async function findExisting(userId: string, idempotencyKeyHash: string) {
  return sbAdmin()
    .from("qr_import_batches")
    .select(`${BATCH_COLUMNS},payload_hash`)
    .eq("user_id", userId)
    .eq("idempotency_key_hash", idempotencyKeyHash)
    .maybeSingle();
}

const getHandler = createBulkImportGetHandler({
  authenticate: authRequest,
  listImports: async (userId, limit) => sbAdmin()
    .from("qr_import_batches")
    .select(BATCH_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit),
  safeDbError: safeDbErrorMessage,
});

const postHandler = createBulkImportPostHandler({
  authenticate: authRequest,
  validate: request => validateRequestBody(request, createBulkImportSchema),
  findExisting,
  getPlan: getUserPlan,
  canAccessBulk: userId => canAccessFeature(userId, "bulk_upload"),
  findFolder: async folderId => sbAdmin()
    .from("qr_folders")
    .select("id,user_id")
    .eq("id", folderId)
    .maybeSingle(),
  findMembership: async (organizationId, userId) => sbAdmin()
    .from("organization_members")
    .select("role,status")
    .eq("org_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle(),
  findStyle: async styleId => sbAdmin()
    .from("qr_styles")
    .select("id,user_id,visibility")
    .eq("id", styleId)
    .maybeSingle(),
  insertBatch: async record => sbAdmin()
    .from("qr_import_batches")
    .insert(record)
    .select(BATCH_COLUMNS)
    .single(),
  insertRows: async records => {
    const { error } = await sbAdmin().from("qr_import_rows").insert(records);
    return { error };
  },
  deleteBatch: async (batchId, userId) => {
    await sbAdmin().from("qr_import_batches").delete().eq("id", batchId).eq("user_id", userId);
  },
  safeDbError: safeDbErrorMessage,
});

export async function POST(req: NextRequest) {
  return postHandler(req);
}

export async function GET(req: NextRequest) {
  return getHandler(req);
}

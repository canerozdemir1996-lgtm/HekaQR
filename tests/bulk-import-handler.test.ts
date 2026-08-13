import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  createBulkImportGetHandler,
  createBulkImportPostHandler,
  hashBulkImportValue,
  type BulkImportPayload,
  type BulkImportPostDependencies,
} from "../lib/server/bulk-import-handler";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FOLDER_ID = "22222222-2222-4222-8222-222222222222";
const ORGANIZATION_ID = "33333333-3333-4333-8333-333333333333";
const STYLE_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-07-16T12:00:00.000Z";

const payload: BulkImportPayload = {
  name: "Integration import",
  source_format: "csv",
  rows: [{
    title: "Ürün",
    type: "url",
    fields: { url: "https://example.com/urun" },
    source_row: 2,
  }],
};

function request(idempotencyKey = "integration-key") {
  return new NextRequest("http://localhost/api/v1/imports", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

function dependencies(overrides: Partial<BulkImportPostDependencies> = {}): BulkImportPostDependencies {
  return {
    authenticate: async () => ({ userId: USER_ID }),
    validate: async () => ({ valid: true, data: payload }),
    findExisting: async () => ({ data: null, error: null }),
    getPlan: async () => ({ limits: { max_bulk_qr_per_month: 100 } }),
    canAccessBulk: async () => true,
    findFolder: async () => ({ data: { user_id: USER_ID }, error: null }),
    findMembership: async () => ({ data: { role: "editor", status: "active" }, error: null }),
    findStyle: async () => ({ data: { user_id: USER_ID, visibility: "private" }, error: null }),
    insertBatch: async record => ({ data: { id: "batch-1", ...record }, error: null }),
    insertRows: async () => ({ error: null }),
    deleteBatch: async () => {},
    safeDbError: (_error, _context, fallback) => fallback ?? "Güvenli DB hatası",
    now: () => NOW,
    ...overrides,
  };
}

test("bulk import history requires auth, clamps limits and disables caching", async () => {
  const unauthorized = await createBulkImportGetHandler({
    authenticate: async () => null,
    listImports: async () => ({ data: [], error: null }),
    safeDbError: () => "safe",
  })(new NextRequest("http://localhost/api/v1/imports"));
  assert.equal(unauthorized.status, 401);

  let requested: [string, number] | null = null;
  const response = await createBulkImportGetHandler({
    authenticate: async () => ({ userId: USER_ID }),
    listImports: async (userId, limit) => {
      requested = [userId, limit];
      return { data: [{ id: "batch-1" }], error: null };
    },
    safeDbError: () => "safe",
  })(new NextRequest("http://localhost/api/v1/imports?limit=999"));
  assert.equal(response.status, 200);
  assert.deepEqual(requested, [USER_ID, 50]);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { imports: [{ id: "batch-1" }] });
});

test("bulk import history returns a safe database error", async () => {
  const response = await createBulkImportGetHandler({
    authenticate: async () => ({ userId: USER_ID }),
    listImports: async () => ({ data: null, error: { message: "relation qr_import_batches" } }),
    safeDbError: (_error, context, fallback) => `${context}:${fallback}`,
  })(new NextRequest("http://localhost/api/v1/imports?limit=invalid"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "imports.GET:İçe aktarma geçmişi yüklenemedi." });
});

test("bulk import handler rejects unauthenticated, invalid-key and invalid-body requests", async () => {
  const unauthorized = await createBulkImportPostHandler(dependencies({ authenticate: async () => null }))(request());
  assert.equal(unauthorized.status, 401);

  const badKey = await createBulkImportPostHandler(dependencies())(request("short"));
  assert.equal(badKey.status, 400);

  const validationError = Object.assign(new Error("Geçersiz payload"), { details: { rows: "zorunlu" } });
  const invalidBody = await createBulkImportPostHandler(dependencies({
    validate: async () => ({ valid: false, error: validationError }),
  }))(request());
  assert.equal(invalidBody.status, 400);
  assert.deepEqual(await invalidBody.json(), { error: "Geçersiz payload", details: { rows: "zorunlu" } });
});

test("bulk import handler persists a ready batch and deterministic pending rows", async () => {
  const captured: { batch?: Record<string, unknown> } = {};
  let insertedRows: Record<string, unknown>[] = [];
  const response = await createBulkImportPostHandler(dependencies({
    insertBatch: async record => {
      captured.batch = record;
      return { data: { id: "batch-1", ...record }, error: null };
    },
    insertRows: async records => {
      insertedRows = records;
      return { error: null };
    },
  }))(request());

  assert.equal(response.status, 201);
  assert.equal(captured.batch?.status, "ready");
  assert.equal(captured.batch?.qr_mode, "dynamic");
  assert.equal(captured.batch?.updated_at, NOW);
  assert.equal(insertedRows.length, 1);
  assert.equal(insertedRows[0].row_number, 2);
  assert.equal(insertedRows[0].status, "pending");
  assert.equal(insertedRows[0].payload_hash, hashBulkImportValue(JSON.stringify(payload.rows[0])));
});

test("idempotency replay returns the original batch and rejects payload reuse", async () => {
  const payloadHash = hashBulkImportValue(JSON.stringify(payload));
  const replay = await createBulkImportPostHandler(dependencies({
    findExisting: async () => ({ data: { id: "existing", payload_hash: payloadHash }, error: null }),
  }))(request());
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { import: { id: "existing" }, idempotent_replay: true });

  const conflict = await createBulkImportPostHandler(dependencies({
    findExisting: async () => ({ data: { id: "existing", payload_hash: "different" }, error: null }),
  }))(request());
  assert.equal(conflict.status, 409);
});

test("plan access and monthly file limits are enforced before writes", async () => {
  let writes = 0;
  const blocked = await createBulkImportPostHandler(dependencies({
    canAccessBulk: async () => false,
    insertBatch: async () => { writes += 1; return { data: null, error: null }; },
  }))(request());
  assert.equal(blocked.status, 402);

  const overLimit = await createBulkImportPostHandler(dependencies({
    getPlan: async () => ({ limits: { max_bulk_qr_per_month: 0 } }),
    insertBatch: async () => { writes += 1; return { data: null, error: null }; },
  }))(request());
  assert.equal(overLimit.status, 402);
  assert.equal(writes, 0);
});

test("folder, organization and style boundaries return 403", async () => {
  const withResources: BulkImportPayload = {
    ...payload,
    folder_id: FOLDER_ID,
    organization_id: ORGANIZATION_ID,
    style_id: STYLE_ID,
  };
  const validate = async () => ({ valid: true as const, data: withResources });

  const folderDenied = await createBulkImportPostHandler(dependencies({
    validate,
    findFolder: async () => ({ data: { user_id: "other-user" }, error: null }),
  }))(request());
  assert.equal(folderDenied.status, 403);

  const organizationDenied = await createBulkImportPostHandler(dependencies({
    validate,
    findMembership: async () => ({ data: { role: "viewer", status: "active" }, error: null }),
  }))(request());
  assert.equal(organizationDenied.status, 403);

  const styleDenied = await createBulkImportPostHandler(dependencies({
    validate,
    findStyle: async () => ({ data: { user_id: "other-user", visibility: "private" }, error: null }),
  }))(request());
  assert.equal(styleDenied.status, 403);
});

test("row insert failure deletes the incomplete batch and returns a safe error", async () => {
  let deleted: [string, string] | null = null;
  const response = await createBulkImportPostHandler(dependencies({
    insertRows: async () => ({ error: { message: "sensitive relation name", code: "42P01" } }),
    deleteBatch: async (batchId, userId) => { deleted = [batchId, userId]; },
  }))(request());
  assert.equal(response.status, 500);
  assert.deepEqual(deleted, ["batch-1", USER_ID]);
  assert.deepEqual(await response.json(), { error: "İçe aktarma satırları kaydedilemedi." });
});

test("unique-key insert races resolve as an idempotent replay", async () => {
  const payloadHash = hashBulkImportValue(JSON.stringify(payload));
  let lookupCount = 0;
  const response = await createBulkImportPostHandler(dependencies({
    findExisting: async () => {
      lookupCount += 1;
      return lookupCount === 1
        ? { data: null, error: null }
        : { data: { id: "raced-batch", payload_hash: payloadHash }, error: null };
    },
    insertBatch: async () => ({ data: null, error: { message: "unique", code: "23505" } }),
  }))(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { import: { id: "raced-batch" }, idempotent_replay: true });
});

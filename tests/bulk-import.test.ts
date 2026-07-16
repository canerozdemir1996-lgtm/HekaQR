import assert from "node:assert/strict";
import test from "node:test";
import writeXlsxFile from "write-excel-file/universal";
import { createBulkTemplateCsv, createBulkTemplateXlsx, parseBulkCsv, parseBulkWorkbook } from "../lib/bulk-import";
import { buildBulkQrPayload, bulkImportSlug } from "../lib/bulk-qr-payload";
import { createBulkImportSchema } from "../lib/schemas/validationSchemas";
import { createImportDispatchToken, verifyImportDispatchToken } from "../lib/server/import-dispatch-auth";
import { summarizeImportProgress } from "../lib/bulk-import-progress";

test("parseBulkCsv supports semicolon-delimited Turkish headers and quoted values", () => {
  const result = parseBulkCsv([
    "başlık;tür;url;metin",
    '"Yaz; Kampanyası";url;https://example.com/yaz;',
    "Duyuru;metin;;Bakım tamamlandı",
  ].join("\n"));

  assert.equal(result.issues.length, 0);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].title, "Yaz; Kampanyası");
  assert.deepEqual(result.rows[1].fields, { text: "Bakım tamamlandı" });
  assert.equal(result.rows[1].source_row, 3);
});

test("parseBulkCsv rejects invalid URLs and skips duplicate normalized rows", () => {
  const result = parseBulkCsv([
    "title,type,url",
    "Ürün,url,https://example.com/urun",
    "Ürün,url,https://example.com/urun",
    "Tehlikeli,url,javascript:alert(1)",
  ].join("\n"));

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.issues.map(issue => issue.code), ["DUPLICATE_ROW", "INVALID_VALUE"]);
});

test("manual column mapping recovers files with unknown vendor headers", () => {
  const csv = "QR Name,Destination\nPartner landing,https://example.com/partner";
  const automatic = parseBulkCsv(csv);
  assert.equal(automatic.rows.length, 0);
  assert.ok(automatic.issues.some(issue => issue.code === "MISSING_COLUMN"));

  const mapped = parseBulkCsv(csv, { title: 0, url: 1, type: -1 });
  assert.equal(mapped.issues.length, 0);
  assert.equal(mapped.rows[0].title, "Partner landing");
  assert.deepEqual(mapped.rows[0].fields, { url: "https://example.com/partner" });
});

test("parseBulkWorkbook reads the first XLSX sheet with the same mapping rules", async () => {
  const blob = await writeXlsxFile([
    ["title", "type", "ssid", "password", "security"],
    ["Ofis Wi-Fi", "wifi", "QRPublish", "gizli", "WPA2"],
  ]).toBlob();

  const result = await parseBulkWorkbook(await blob.arrayBuffer());
  assert.equal(result.sourceFormat, "xlsx");
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.rows[0].fields, { ssid: "QRPublish", password: "gizli", security: "WPA2" });
});

test("downloadable CSV and XLSX templates both parse into the same example rows", async () => {
  const csv = parseBulkCsv(createBulkTemplateCsv());
  const xlsx = await parseBulkWorkbook(await createBulkTemplateXlsx());
  assert.equal(csv.issues.length, 0);
  assert.equal(xlsx.issues.length, 0);
  assert.deepEqual(xlsx.rows, csv.rows);
});

test("createBulkImportSchema requires durable source row numbers", () => {
  const valid = createBulkImportSchema.safeParse({
    name: "Temmuz kataloğu",
    source_format: "xlsx",
    rows: [{
      title: "Ürün",
      type: "url",
      fields: { url: "https://example.com/urun" },
      source_row: 2,
    }],
  });
  assert.equal(valid.success, true);

  const invalid = createBulkImportSchema.safeParse({
    name: "Eksik satır",
    source_format: "csv",
    rows: [{ title: "Ürün", type: "url", fields: { url: "https://example.com" } }],
  });
  assert.equal(invalid.success, false);
});

test("bulk import slugs and payloads are deterministic across retries", () => {
  const context = {
    batchId: "123e4567-e89b-12d3-a456-426614174000",
    rowNumber: 42,
    publicOrigin: "https://qrpublish.com/",
    qrMode: "dynamic" as const,
    folderId: "223e4567-e89b-12d3-a456-426614174000",
  };
  const row = {
    title: "Ofis Wi-Fi",
    type: "wifi" as const,
    fields: { ssid: "QR;Publish", password: "a:b", security: "WPA2" },
    source_row: 42,
  };

  assert.equal(bulkImportSlug(context.batchId, 42), bulkImportSlug(context.batchId, 42));
  const first = buildBulkQrPayload(row, context);
  const replay = buildBulkQrPayload(row, context);
  assert.deepEqual(first, replay);
  assert.match(first.target_url, /^WIFI:T:WPA2;S:QR\\;Publish;P:a\\:b;;$/);
  assert.equal(first.folder_id, context.folderId);
});

test("only server-signed import dispatches can bypass the ordinary create rate limit", () => {
  const secret = "test-service-role-secret";
  const batchId = "123e4567-e89b-12d3-a456-426614174000";
  const userId = "223e4567-e89b-12d3-a456-426614174000";
  const token = createImportDispatchToken(batchId, 9, userId, secret);

  assert.equal(verifyImportDispatchToken(token, batchId, "9", userId, secret), true);
  assert.equal(verifyImportDispatchToken(token, batchId, "10", userId, secret), false);
  assert.equal(verifyImportDispatchToken(token, batchId, "9", "other-user", secret), false);
  assert.equal(verifyImportDispatchToken("not-hex", batchId, "9", userId, secret), false);
});

test("retry progress only counts failed rows not yet attempted in the current retry run", () => {
  const retryRunId = "33333333-3333-4333-8333-333333333333";
  const progress = summarizeImportProgress([
    { row_number: 2, status: "created" },
    { row_number: 3, status: "failed", last_retry_run_id: retryRunId },
    { row_number: 4, status: "failed", last_retry_run_id: null },
    { row_number: 5, status: "pending" },
  ], retryRunId);

  assert.equal(progress.retryableFailed, 1);
  assert.equal(progress.remaining, 2);
  assert.equal(progress.status, "processing");
  assert.equal(progress.currentRow, 4);
});

test("finished imports distinguish completed, partial and failed outcomes", () => {
  assert.equal(summarizeImportProgress([{ row_number: 2, status: "created" }]).status, "completed");
  assert.equal(summarizeImportProgress([
    { row_number: 2, status: "created" },
    { row_number: 3, status: "failed" },
  ]).status, "partial");
  assert.equal(summarizeImportProgress([{ row_number: 2, status: "failed" }]).status, "failed");
});

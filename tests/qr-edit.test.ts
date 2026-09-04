import assert from "node:assert/strict";
import test from "node:test";
import { staticQrPayloadForUpdate, usesEditableUrlField } from "../lib/qr-edit";

test("product QR edits hydrate the URL-backed form field", () => {
  assert.equal(usesEditableUrlField("url"), true);
  assert.equal(usesEditableUrlField("product"), true);
  assert.equal(usesEditableUrlField("wifi"), false);
});

test("static QR edits replace the payload used to regenerate the QR", () => {
  assert.equal(staticQrPayloadForUpdate("static", "https://changed.example"), "https://changed.example");
  assert.equal(staticQrPayloadForUpdate("dynamic", "https://changed.example"), undefined);
  assert.equal(staticQrPayloadForUpdate("static", undefined), undefined);
});

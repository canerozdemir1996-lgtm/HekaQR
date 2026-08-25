import assert from "node:assert/strict";
import test from "node:test";
import { staticQrTargetChanged, usesEditableUrlField } from "../lib/qr-edit";

test("product QR edits hydrate the URL-backed form field", () => {
  assert.equal(usesEditableUrlField("url"), true);
  assert.equal(usesEditableUrlField("product"), true);
  assert.equal(usesEditableUrlField("wifi"), false);
});

test("legacy static QR edits compare against target_url when static_payload is absent", () => {
  assert.equal(staticQrTargetChanged("https://example.com", null, "https://example.com"), false);
  assert.equal(staticQrTargetChanged("https://changed.example", null, "https://example.com"), true);
  assert.equal(staticQrTargetChanged(undefined, null, "https://example.com"), false);
});

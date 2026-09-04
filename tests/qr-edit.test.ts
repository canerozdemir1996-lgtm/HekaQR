import assert from "node:assert/strict";
import test from "node:test";
import { readStoredQrDesign, staticQrTargetChanged, usesEditableUrlField } from "../lib/qr-edit";

test("product QR edits hydrate the URL-backed form field", () => {
  assert.equal(usesEditableUrlField("url"), true);
  assert.equal(usesEditableUrlField("product"), true);
  assert.equal(usesEditableUrlField("wifi"), false);
});

test("saved custom QR design and embedded logo survive reopening the editor", () => {
  const design = { dotColor: "#111111", savedLogoData: "data:image/png;base64,logo" };
  assert.deepEqual(readStoredQrDesign(design), design);
  assert.equal(readStoredQrDesign({}), null);
  assert.equal(readStoredQrDesign(null), null);
});

test("legacy static QR edits compare against target_url when static_payload is absent", () => {
  assert.equal(staticQrTargetChanged("https://example.com", null, "https://example.com"), false);
  assert.equal(staticQrTargetChanged("https://changed.example", null, "https://example.com"), true);
  assert.equal(staticQrTargetChanged(undefined, null, "https://example.com"), false);
});

test("static QR target comparison ignores harmless HTTP URL normalization", () => {
  assert.equal(staticQrTargetChanged("https://EXAMPLE.com:443/path/", null, "https://example.com/path"), false);
  assert.equal(staticQrTargetChanged("https://example.com/%7Euser", null, "https://example.com/~user/"), false);
  assert.equal(staticQrTargetChanged("https://example.com/path?x=1", null, "https://example.com/path?x=2"), true);
  assert.equal(staticQrTargetChanged("mailto:a@example.com", null, "mailto:b@example.com"), true);
});

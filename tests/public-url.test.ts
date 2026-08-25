import assert from "node:assert/strict";
import test from "node:test";
import { safeAppStoreUrl, safePublicHttpUrl, safeQrRedirectUrl } from "../lib/public-url";

test("safePublicHttpUrl accepts HTTP(S) and rejects executable schemes", () => {
  assert.equal(safePublicHttpUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(safePublicHttpUrl("javascript:alert(1)"), "");
  assert.equal(safePublicHttpUrl("data:text/html,bad"), "");
  assert.equal(safePublicHttpUrl("/relative"), "");
});

test("generic QR redirects fail closed for executable or malformed stored URLs", () => {
  assert.equal(safeQrRedirectUrl("https://example.com/path")?.toString(), "https://example.com/path");
  assert.equal(safeQrRedirectUrl("javascript:alert(1)"), null);
  assert.equal(safeQrRedirectUrl("data:text/html,bad"), null);
  assert.equal(safeQrRedirectUrl("market://details?id=com.example"), null);
});

test("app-store deep links have a QR-type-specific allowlist", () => {
  assert.equal(safeAppStoreUrl("itms-apps://itunes.apple.com/app/id123"), "itms-apps://itunes.apple.com/app/id123");
  assert.equal(safeAppStoreUrl("market://details?id=com.example"), "market://details?id=com.example");
  assert.equal(safeAppStoreUrl("javascript:alert(1)"), "");
  assert.equal(safeAppStoreUrl("data:text/html,bad"), "");
});

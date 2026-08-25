import assert from "node:assert/strict";
import test from "node:test";
import { safePublicHttpUrl } from "../lib/public-url";

test("safePublicHttpUrl accepts HTTP(S) and rejects executable schemes", () => {
  assert.equal(safePublicHttpUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(safePublicHttpUrl("javascript:alert(1)"), "");
  assert.equal(safePublicHttpUrl("data:text/html,bad"), "");
  assert.equal(safePublicHttpUrl("/relative"), "");
});

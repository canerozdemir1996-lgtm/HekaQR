import assert from "node:assert/strict";
import test from "node:test";

import { safeInternalPath, withNextParam } from "../lib/auth-redirect";
import { parseCookieChoice } from "../lib/cookie-consent";

test("safeInternalPath preserves valid in-app destinations", () => {
  assert.equal(safeInternalPath("/pricing?plan=pro#compare"), "/pricing?plan=pro#compare");
  assert.equal(safeInternalPath(" /invite/abc?source=email "), "/invite/abc?source=email");
  assert.equal(safeInternalPath(undefined), "/dashboard");
});

test("safeInternalPath rejects external, protocol-relative and malformed destinations", () => {
  for (const unsafe of [
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "javascript:alert(1)",
    "/dashboard\nSet-Cookie:test=1",
  ]) {
    assert.equal(safeInternalPath(unsafe, "/login"), "/login", unsafe);
  }
});

test("withNextParam safely carries checkout or invite intent through auth", () => {
  assert.equal(
    withNextParam("/login", "/pricing?checkout=pro-yearly"),
    "/login?next=%2Fpricing%3Fcheckout%3Dpro-yearly",
  );
  assert.equal(
    withNextParam("/signup?source=invite", "//evil.example"),
    "/signup?source=invite&next=%2Fdashboard",
  );
});

test("cookie consent parser only accepts explicit supported choices", () => {
  assert.equal(parseCookieChoice(JSON.stringify({ choice: "accepted" })), "accepted");
  assert.equal(parseCookieChoice(JSON.stringify({ choice: "necessary" })), "necessary");
  assert.equal(parseCookieChoice(JSON.stringify({ choice: "all" })), null);
  assert.equal(parseCookieChoice("not-json"), null);
});

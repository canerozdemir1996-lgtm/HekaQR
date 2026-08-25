import assert from "node:assert/strict";
import test from "node:test";
import { isMfaCookieValid, mfaCookieValueFor } from "../lib/mfaCookie";

process.env.MFA_COOKIE_SECRET = "test-only-mfa-cookie-secret-with-enough-entropy";

test("MFA cookie is signed and bound to the authenticated user", async () => {
  const value = await mfaCookieValueFor("user-a");
  assert.equal(await isMfaCookieValid(value, "user-a"), true);
  assert.equal(await isMfaCookieValid(value, "user-b"), false);
  const plainDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("user-a"));
  const plainHash = Array.from(new Uint8Array(plainDigest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  assert.notEqual(value, plainHash);
});

test("MFA cookie rejects tampering", async () => {
  const value = await mfaCookieValueFor("user-a");
  const tampered = `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  assert.equal(await isMfaCookieValid(tampered, "user-a"), false);
});

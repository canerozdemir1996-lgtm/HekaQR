import assert from "node:assert/strict";
import test from "node:test";
import { isMfaCookieValid, mfaCookieValueFor, mfaSessionIdFromAccessToken } from "../lib/mfaCookie";

const NOW = Date.UTC(2026, 7, 25, 12, 0, 0);

function accessToken(sessionId: string) {
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString("base64url");
  return `header.${payload}.signature`;
}

test("MFA cookie is HMAC-bound to both user and Supabase session", async () => {
  process.env.MFA_COOKIE_SECRET = "test-only-mfa-cookie-secret-with-high-entropy";
  const value = await mfaCookieValueFor("user-a", "session-a", NOW);
  assert.equal(await isMfaCookieValid(value, "user-a", "session-a", NOW), true);
  assert.equal(await isMfaCookieValid(value, "user-b", "session-a", NOW), false);
  assert.equal(await isMfaCookieValid(value, "user-a", "session-b", NOW), false);
});

test("MFA cookie server-side expiry and signature tampering fail closed", async () => {
  process.env.MFA_COOKIE_SECRET = "test-only-mfa-cookie-secret-with-high-entropy";
  const value = await mfaCookieValueFor("user-a", "session-a", NOW);
  const tampered = `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  assert.equal(await isMfaCookieValid(tampered, "user-a", "session-a", NOW), false);
  assert.equal(await isMfaCookieValid(value, "user-a", "session-a", NOW + 31 * 24 * 60 * 60 * 1000), false);
});

test("MFA session context is read only from the access-token session_id claim", () => {
  assert.equal(mfaSessionIdFromAccessToken(accessToken("session-a")), "session-a");
  assert.equal(mfaSessionIdFromAccessToken("malformed"), "");
});

test("production MFA secrets reject short or cross-purpose values", async () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previous = { nodeEnv: process.env.NODE_ENV, mfa: process.env.MFA_COOKIE_SECRET, unlock: process.env.QR_UNLOCK_SECRET };
  try {
    mutableEnv.NODE_ENV = "production";
    process.env.MFA_COOKIE_SECRET = "short";
    process.env.QR_UNLOCK_SECRET = "different-but-also-not-used";
    await assert.rejects(mfaCookieValueFor("user-a", "session-a", NOW), /at least 32/i);
    process.env.MFA_COOKIE_SECRET = "a".repeat(40);
    process.env.QR_UNLOCK_SECRET = "a".repeat(40);
    await assert.rejects(mfaCookieValueFor("user-a", "session-a", NOW), /must be different/i);
  } finally {
    if (previous.nodeEnv === undefined) delete mutableEnv.NODE_ENV; else mutableEnv.NODE_ENV = previous.nodeEnv;
    if (previous.mfa === undefined) delete process.env.MFA_COOKIE_SECRET; else process.env.MFA_COOKIE_SECRET = previous.mfa;
    if (previous.unlock === undefined) delete process.env.QR_UNLOCK_SECRET; else process.env.QR_UNLOCK_SECRET = previous.unlock;
  }
});

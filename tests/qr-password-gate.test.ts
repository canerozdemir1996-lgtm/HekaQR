import assert from "node:assert/strict";
import test from "node:test";
import { buildUnlockCookie, isUnlockCookieValid, unlockCookieName } from "../lib/qrPasswordGate";

test("unlockCookieName: stable for the same slug regardless of case", () => {
  assert.equal(unlockCookieName("MyQr"), unlockCookieName("myqr"));
});

test("unlockCookieName: different slugs produce different cookie names", () => {
  assert.notEqual(unlockCookieName("qr-one"), unlockCookieName("qr-two"));
});

test("buildUnlockCookie + isUnlockCookieValid: round-trips for the correct slug/password pair", () => {
  const cookie = buildUnlockCookie("my-qr", "secret123");
  assert.equal(isUnlockCookieValid("my-qr", "secret123", cookie.value), true);
});

test("isUnlockCookieValid: rejects when the password doesn't match", () => {
  const cookie = buildUnlockCookie("my-qr", "secret123");
  assert.equal(isUnlockCookieValid("my-qr", "wrong-password", cookie.value), false);
});

test("isUnlockCookieValid: rejects a cookie issued for a different slug", () => {
  const cookie = buildUnlockCookie("qr-a", "secret123");
  assert.equal(isUnlockCookieValid("qr-b", "secret123", cookie.value), false);
});

test("isUnlockCookieValid: rejects missing or malformed cookie values", () => {
  assert.equal(isUnlockCookieValid("my-qr", "secret123", null), false);
  assert.equal(isUnlockCookieValid("my-qr", "secret123", undefined), false);
  assert.equal(isUnlockCookieValid("my-qr", "secret123", ""), false);
  assert.equal(isUnlockCookieValid("my-qr", "secret123", "not-a-valid-cookie"), false);
});

test("isUnlockCookieValid: rejects an expired cookie", () => {
  const expiredAt = Date.now() - 1000;
  const tampered = `${expiredAt}.deadbeef`;
  assert.equal(isUnlockCookieValid("my-qr", "secret123", tampered), false);
});

test("isUnlockCookieValid: rejects a tampered signature", () => {
  const cookie = buildUnlockCookie("my-qr", "secret123");
  const [expiresAt] = cookie.value.split(".");
  const tampered = `${expiresAt}.${"0".repeat(64)}`;
  assert.equal(isUnlockCookieValid("my-qr", "secret123", tampered), false);
});

test("production QR unlock secrets reject short or cross-purpose values", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previous = { nodeEnv: process.env.NODE_ENV, mfa: process.env.MFA_COOKIE_SECRET, unlock: process.env.QR_UNLOCK_SECRET };
  try {
    mutableEnv.NODE_ENV = "production";
    process.env.QR_UNLOCK_SECRET = "short";
    process.env.MFA_COOKIE_SECRET = "different-but-also-not-used";
    assert.throws(() => buildUnlockCookie("my-qr", "secret123"), /at least 32/i);
    process.env.QR_UNLOCK_SECRET = "b".repeat(40);
    process.env.MFA_COOKIE_SECRET = "b".repeat(40);
    assert.throws(() => buildUnlockCookie("my-qr", "secret123"), /must be different/i);
  } finally {
    if (previous.nodeEnv === undefined) delete mutableEnv.NODE_ENV; else mutableEnv.NODE_ENV = previous.nodeEnv;
    if (previous.mfa === undefined) delete process.env.MFA_COOKIE_SECRET; else process.env.MFA_COOKIE_SECRET = previous.mfa;
    if (previous.unlock === undefined) delete process.env.QR_UNLOCK_SECRET; else process.env.QR_UNLOCK_SECRET = previous.unlock;
  }
});

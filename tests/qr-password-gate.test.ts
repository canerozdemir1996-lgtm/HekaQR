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

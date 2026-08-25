import assert from "node:assert/strict";
import test from "node:test";
import { createQrCodeSchema } from "../lib/schemas/validationSchemas";

const base = {
  title: "Test",
  short_slug: "test-qr",
  target_url: "https://example.com",
};

test("QR redirect rules accept only HTTP(S) destinations", () => {
  assert.equal(createQrCodeSchema.safeParse({ ...base, rules: { device_redirect: { mobile: "https://m.example.com" } } }).success, true);
  assert.equal(createQrCodeSchema.safeParse({ ...base, rules: { country_redirect: { TR: "javascript:alert(1)" } } }).success, false);
  assert.equal(createQrCodeSchema.safeParse({ ...base, rules: { schedule_redirect: [{ url: "data:text/html,bad" }] } }).success, false);
});

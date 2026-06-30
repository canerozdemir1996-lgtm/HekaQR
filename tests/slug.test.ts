import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSlug } from "@/lib/slug";

test("normalizeSlug transliterates Turkish dotted I and other Turkish letters", () => {
  assert.equal(normalizeSlug("İstanbul Iğdır Çeşme Şube"), "istanbul-igdir-cesme-sube");
});

test("normalizeSlug keeps underscores only when requested", () => {
  assert.equal(normalizeSlug("QR_Test İçerik", { allowUnderscore: true }), "qr_test-icerik");
  assert.equal(normalizeSlug("QR_Test İçerik"), "qr-test-icerik");
});

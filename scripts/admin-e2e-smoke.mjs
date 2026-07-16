import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = new URL(process.env.E2E_BASE_URL || "https://qrpublish.com");
const publicQrSlug = process.env.E2E_PUBLIC_QR_SLUG?.trim();

async function request(pathname, redirect = "follow") {
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect,
    headers: { "user-agent": "QRPublish-Admin-Smoke-Test/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  return response;
}

test("ana sayfa yasal ve fiyatlandırma bağlantılarını sunuyor", async () => {
  const response = await request("/");
  assert.ok(response.ok, `Ana sayfa HTTP ${response.status} döndürdü.`);
  const html = await response.text();
  assert.match(html, /href=["'][^"']*pricing/i);
  assert.match(html, /href=["'][^"']*(privacy|gizlilik)/i);
  assert.match(html, /href=["'][^"']*(cookie|cerez)/i);
});

test("kayıt sayfası yasal bilgilendirme bağlantılarını sunuyor", async () => {
  const response = await request("/signup");
  assert.ok(response.ok, `Kayıt sayfası HTTP ${response.status} döndürdü.`);
  const html = await response.text();
  assert.match(html, /href=["'][^"']*(privacy|gizlilik)/i);
  assert.match(html, /href=["'][^"']*(cookie|cerez)/i);
});

test("kimlik doğrulamalı panel akışı", { skip: "Paylaşımlı production sunucusunda tarayıcı oturumu çalıştırılmaz; bu test CI ortamında Playwright ile yürütülür." }, () => {});

test("public QR rotası yanıt veriyor", { skip: publicQrSlug ? false : "E2E_PUBLIC_QR_SLUG ayarlanmadı." }, async () => {
  const response = await request(`/q/${encodeURIComponent(publicQrSlug)}`, "manual");
  assert.ok(response.status < 400, `Public QR rotası HTTP ${response.status} döndürdü.`);
});

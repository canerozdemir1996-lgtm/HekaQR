import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSeoDocument, isPublicSeoAuditIp, resolveSeoAuditTarget, runSeoAudit, SeoAuditError, validateSeoAuditUrl } from "../lib/server/seo-audit";

test("private, loopback, metadata and documentation IP ranges are blocked", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "fd00:ec2::254", "fe80::1", "2001:db8::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPublicSeoAuditIp(address), false, address);
  }
  assert.equal(isPublicSeoAuditIp("8.8.8.8"), true);
  assert.equal(isPublicSeoAuditIp("2606:4700:4700::1111"), true);
});

test("URL validation only accepts standard public HTTP and HTTPS targets", () => {
  for (const url of ["file:///etc/passwd", "http://localhost", "http://169.254.169.254/latest", "https://metadata.google.internal", "https://user:pass@example.com", "https://example.com:8443"]) {
    assert.throws(() => validateSeoAuditUrl(url), SeoAuditError, url);
  }
  assert.equal(validateSeoAuditUrl("https://example.com/path#fragment").toString(), "https://example.com/path");
});

test("DNS resolution rejects private and mixed rebinding answers", async () => {
  await assert.rejects(resolveSeoAuditTarget(new URL("https://example.com"), async () => [{ address: "127.0.0.1", family: 4 }]), /özel/);
  await assert.rejects(resolveSeoAuditTarget(new URL("https://example.com"), async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]), /özel/);
});

test("redirect targets are revalidated before a second request", async () => {
  let calls = 0;
  await assert.rejects(runSeoAudit("https://example.com", {
    resolver: async hostname => hostname === "example.com" ? [{ address: "8.8.8.8", family: 4 }] : [{ address: "127.0.0.1", family: 4 }],
    request: async () => {
      calls += 1;
      return { status: 302, headers: { location: "http://evil.example/secret" }, body: "", bytes: 0 };
    },
  }), /özel/);
  assert.equal(calls, 1);
});

test("oversized and non-HTML responses are rejected", async () => {
  const resolver = async () => [{ address: "8.8.8.8", family: 4 as const }];
  await assert.rejects(runSeoAudit("https://example.com", { resolver, request: async () => ({ status: 200, headers: { "content-type": "text/html" }, body: "x".repeat(1_000_001), bytes: 1_000_001 }) }), /megabayt/);
  await assert.rejects(runSeoAudit("https://example.com", { resolver, request: async () => ({ status: 200, headers: { "content-type": "application/json" }, body: "{}", bytes: 2 }) }), /HTML/);
});

test("HTML analysis returns sanitized fields and actionable checks", () => {
  const body = `<!doctype html><html lang="tr"><head><title>Örnek SEO Başlığı</title><meta name="description" content="Bu örnek açıklama SEO analiz aracının güvenli çıktı üretmesini doğrulamak için yeterince ayrıntılıdır."><meta name="viewport" content="width=device-width"><meta property="og:title" content="Örnek"><meta property="og:description" content="Açıklama"><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{}</script></head><body><h1>Merhaba <script>alert(1)</script></h1></body></html>`;
  const result = analyzeSeoDocument({ url: "https://example.com/", status: 200, headers: {}, body, bytes: Buffer.byteLength(body), redirects: 0, elapsedMs: 12 });
  assert.equal(result.fields.lang, "tr");
  assert.equal(result.fields.h1.length, 1);
  assert.equal(result.fields.h1[0].includes("<script>"), false);
  assert.equal(result.fields.canonical, "https://example.com/");
  assert.ok(result.score > 0 && result.score <= 100);
});

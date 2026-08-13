import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { buildOrganizationSchema, buildPageMetadata, serializeJsonLd } from "../lib/seo";
import { isSeoNoIndexPath, SEO_NOINDEX_EXACT_ROUTES, SEO_NOINDEX_PREFIXES } from "../lib/seo-route-policy";

const require = createRequire(import.meta.url);

test("private, transactional and generated-output routes are noindex", () => {
  for (const path of [
    "/dashboard/my-exams",
    "/admin/tests",
    "/api/v1/qrcodes",
    "/auth/reset",
    "/exam/demo",
    "/q/example",
    "/01/08612345678901",
    "/dev-tools/bulk-e2e",
    "/pricing/checkout",
  ]) assert.equal(isSeoNoIndexPath(path), true, path);
  assert.equal(isSeoNoIndexPath("/"), false);
  assert.equal(isSeoNoIndexPath("/qr-kod-olusturucu"), false);
});

test("robots mirrors the central noindex route policy", () => {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  const disallow = rules.flatMap(rule => Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []);
  for (const route of SEO_NOINDEX_EXACT_ROUTES) assert.ok(disallow.includes(route), route);
  for (const prefix of SEO_NOINDEX_PREFIXES) assert.ok(disallow.includes(`${prefix}/*`), prefix);
  assert.equal(policy.sitemap, "https://qrpublish.com/sitemap.xml");
});

test("sitemap contains unique canonical URLs and excludes noindex routes", () => {
  const rows = sitemap();
  const urls = rows.map(row => row.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://qrpublish.com");
    assert.equal(isSeoNoIndexPath(parsed.pathname), false, parsed.pathname);
  }
});

test("metadata emits canonical and reciprocal homepage hreflang URLs", () => {
  const metadata = buildPageMetadata({
    title: "QR Kod Oluşturucu | QR Publish",
    description: "QR kod oluşturma ve yönetim platformu.",
    path: "/",
    alternateLanguages: { "tr-TR": "/", "en-US": "/en", "x-default": "/" },
  });
  assert.equal(metadata.alternates?.canonical, "https://qrpublish.com/");
  assert.deepEqual(metadata.alternates?.languages, {
    "tr-TR": "https://qrpublish.com/",
    "en-US": "https://qrpublish.com/en",
    "x-default": "https://qrpublish.com/",
  });
});

test("JSON-LD uses canonical organization identity and escapes script breakers", () => {
  const organization = buildOrganizationSchema();
  assert.equal(organization.url, "https://qrpublish.com/");
  assert.equal(organization.logo, "https://qrpublish.com/brand/qr-publish-logo.png");
  assert.equal(serializeJsonLd({ text: "</script>" }).includes("</script>"), false);
});

test("next response headers enforce noindex on non-HTML and output routes", async () => {
  const nextConfig = require("../next.config.js") as { headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>> };
  const headers = await nextConfig.headers();
  for (const source of ["/dashboard/:path*", "/admin/:path*", "/api/:path*", "/q/:path*", "/01/:path*", "/dev-tools/:path*"]) {
    const entry = headers.find(item => item.source === source);
    assert.ok(entry, source);
    assert.ok(entry?.headers.some(header => header.key === "X-Robots-Tag" && header.value === "noindex, nofollow"), source);
  }
});

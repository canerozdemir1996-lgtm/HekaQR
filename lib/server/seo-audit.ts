import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { decode } from "html-entities";

export const SEO_AUDIT_MAX_REDIRECTS = 3;
export const SEO_AUDIT_MAX_BYTES = 1_000_000;
export const SEO_AUDIT_TIMEOUT_MS = 8_000;

type ResolvedAddress = { address: string; family: 4 | 6 };
type SeoResponse = { status: number; headers: Record<string, string | string[] | undefined>; body: string; bytes: number };
type SeoRequest = (url: URL, target: ResolvedAddress) => Promise<SeoResponse>;
type SeoResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export class SeoAuditError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = "SeoAuditError";
  }
}

function cleanHostname(value: string) {
  return value.trim().replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function ipv4Number(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inV4Range(value: number, base: string, prefix: number) {
  const baseValue = ipv4Number(base);
  if (baseValue == null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

export function isPublicSeoAuditIp(input: string) {
  const address = cleanHostname(input);
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Number(address);
    if (value == null) return false;
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !blocked.some(([base, prefix]) => inV4Range(value, base, prefix));
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    const mapped = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicSeoAuditIp(mapped[1]);
    return !(
      normalized === "::" || normalized === "::1" ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:") || normalized === "2001:db8::" ||
      normalized.startsWith("64:ff9b:")
    );
  }
  return false;
}

export function validateSeoAuditUrl(rawUrl: unknown) {
  const raw = String(rawUrl ?? "").trim();
  if (!raw || raw.length > 2048) throw new SeoAuditError("Geçerli bir URL girin.", "INVALID_URL");
  let url: URL;
  try { url = new URL(raw); } catch { throw new SeoAuditError("URL biçimi geçersiz.", "INVALID_URL"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SeoAuditError("Yalnız http ve https URL'leri desteklenir.", "BAD_PROTOCOL");
  if (url.username || url.password) throw new SeoAuditError("Kullanıcı bilgisi içeren URL'ler desteklenmez.", "URL_CREDENTIALS");
  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) throw new SeoAuditError("Yalnız standart 80 ve 443 portları desteklenir.", "BAD_PORT");
  const hostname = cleanHostname(url.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan")) {
    throw new SeoAuditError("Yerel ve özel ağ adresleri taranamaz.", "PRIVATE_HOST");
  }
  if (["metadata.google.internal", "metadata.google", "instance-data", "instance-data.ec2.internal"].includes(hostname)) {
    throw new SeoAuditError("Metadata servisleri taranamaz.", "METADATA_HOST");
  }
  if (isIP(hostname) && !isPublicSeoAuditIp(hostname)) throw new SeoAuditError("Yerel ve özel IP adresleri taranamaz.", "PRIVATE_IP");
  url.hash = "";
  return url;
}

async function defaultResolver(hostname: string): Promise<ResolvedAddress[]> {
  if (isIP(hostname)) return [{ address: cleanHostname(hostname), family: isIP(hostname) as 4 | 6 }];
  const rows = await lookup(hostname, { all: true, verbatim: true });
  return rows.map(row => ({ address: row.address, family: row.family as 4 | 6 }));
}

export async function resolveSeoAuditTarget(url: URL, resolver: SeoResolver = defaultResolver) {
  const addresses = await resolver(cleanHostname(url.hostname)).catch(() => []);
  if (!addresses.length) throw new SeoAuditError("Alan adı çözümlenemedi.", "DNS_FAILED", 422);
  if (addresses.some(row => !isPublicSeoAuditIp(row.address))) {
    throw new SeoAuditError("Alan adı özel veya ayrılmış bir IP adresine çözümleniyor.", "PRIVATE_DNS_TARGET");
  }
  return addresses[0];
}

function headerValue(headers: SeoResponse["headers"], name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

async function requestPinned(url: URL, target: ResolvedAddress): Promise<SeoResponse> {
  return new Promise((resolve, reject) => {
    const secure = url.protocol === "https:";
    const request = (secure ? httpsRequest : httpRequest)({
      protocol: url.protocol,
      hostname: target.address,
      port: secure ? 443 : 80,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      servername: secure ? cleanHostname(url.hostname) : undefined,
      headers: {
        Host: url.host,
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "Accept-Encoding": "identity",
        "User-Agent": "QRPublish-SEO-Audit/1.0",
      },
    }, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", chunk => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > SEO_AUDIT_MAX_BYTES) {
          request.destroy(new SeoAuditError("Yanıt bir megabayt sınırını aşıyor.", "BODY_TOO_LARGE", 413));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
        bytes,
      }));
    });
    request.setTimeout(SEO_AUDIT_TIMEOUT_MS, () => request.destroy(new SeoAuditError("URL zaman aşımına uğradı.", "TIMEOUT", 504)));
    request.on("error", reject);
    request.end();
  });
}

function text(value: string, max = 500) {
  return decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function metaContent(html: string, key: string) {
  const target = key.toLowerCase();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.name ?? attrs.property ?? "").toLowerCase() === target) return text(attrs.content ?? "");
  }
  return "";
}

function linkHref(html: string, rel: string) {
  const target = rel.toLowerCase();
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.rel ?? "").toLowerCase().split(/\s+/).includes(target)) return text(attrs.href ?? "", 2048);
  }
  return "";
}

function tagText(html: string, tag: string) {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(html);
  return match ? text(match[1]) : "";
}

export function analyzeSeoDocument(input: { url: string; status: number; headers: SeoResponse["headers"]; body: string; bytes: number; redirects: number; elapsedMs: number }) {
  const html = input.body;
  const title = tagText(html, "title");
  const description = metaContent(html, "description");
  const canonical = linkHref(html, "canonical");
  const robots = [metaContent(html, "robots"), headerValue(input.headers, "x-robots-tag")].filter(Boolean).join(", ");
  const h1Matches = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1 = h1Matches.map(match => text(match[1])).filter(Boolean).slice(0, 10);
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  const lang = text(attributes(htmlTag).lang ?? "", 40);
  const structuredDataCount = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi)).length;
  const fields = {
    title,
    description,
    canonical,
    robots,
    lang,
    h1,
    ogTitle: metaContent(html, "og:title"),
    ogDescription: metaContent(html, "og:description"),
    viewport: metaContent(html, "viewport"),
    structuredDataCount,
  };
  const checks = [
    { key: "status", label: "HTTP durumu", status: input.status >= 200 && input.status < 300 ? "pass" : "fail", message: `HTTP ${input.status}` },
    { key: "title", label: "Başlık", status: title.length >= 10 && title.length <= 60 ? "pass" : title ? "warning" : "fail", message: title ? `${title.length} karakter` : "Başlık bulunamadı" },
    { key: "description", label: "Meta açıklama", status: description.length >= 70 && description.length <= 160 ? "pass" : description ? "warning" : "fail", message: description ? `${description.length} karakter` : "Meta açıklama bulunamadı" },
    { key: "canonical", label: "Canonical", status: canonical ? "pass" : "warning", message: canonical || "Canonical bulunamadı" },
    { key: "h1", label: "H1", status: h1.length === 1 ? "pass" : h1.length ? "warning" : "fail", message: `${h1.length} H1` },
    { key: "robots", label: "İndeksleme", status: /noindex/i.test(robots) ? "warning" : "pass", message: robots || "index, follow varsayımı" },
    { key: "lang", label: "Dil", status: lang ? "pass" : "warning", message: lang || "html lang bulunamadı" },
    { key: "open_graph", label: "Open Graph", status: fields.ogTitle && fields.ogDescription ? "pass" : "warning", message: fields.ogTitle && fields.ogDescription ? "Başlık ve açıklama mevcut" : "OG başlık veya açıklama eksik" },
    { key: "viewport", label: "Mobil viewport", status: fields.viewport ? "pass" : "warning", message: fields.viewport || "Viewport bulunamadı" },
    { key: "structured_data", label: "Structured data", status: structuredDataCount > 0 ? "pass" : "warning", message: `${structuredDataCount} JSON-LD bloğu` },
  ] as Array<{ key: string; label: string; status: "pass" | "warning" | "fail"; message: string }>;
  const points = checks.reduce((sum, check) => sum + (check.status === "pass" ? 10 : check.status === "warning" ? 5 : 0), 0);
  return { score: Math.round((points / (checks.length * 10)) * 100), fields, checks };
}

export async function runSeoAudit(rawUrl: unknown, deps: { resolver?: SeoResolver; request?: SeoRequest; now?: () => number } = {}) {
  const started = (deps.now ?? Date.now)();
  let current = validateSeoAuditUrl(rawUrl);
  let redirects = 0;
  while (true) {
    const target = await resolveSeoAuditTarget(current, deps.resolver);
    const response = await (deps.request ?? requestPinned)(current, target);
    if (response.bytes > SEO_AUDIT_MAX_BYTES || Buffer.byteLength(response.body) > SEO_AUDIT_MAX_BYTES) {
      throw new SeoAuditError("Yanıt bir megabayt sınırını aşıyor.", "BODY_TOO_LARGE", 413);
    }
    const location = headerValue(response.headers, "location");
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      if (redirects >= SEO_AUDIT_MAX_REDIRECTS) throw new SeoAuditError("URL çok fazla yönlendirme yaptı.", "TOO_MANY_REDIRECTS", 422);
      current = validateSeoAuditUrl(new URL(location, current).toString());
      redirects += 1;
      continue;
    }
    const contentType = headerValue(response.headers, "content-type").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new SeoAuditError("URL bir HTML sayfası döndürmüyor.", "NOT_HTML", 422);
    }
    const elapsedMs = Math.max(0, (deps.now ?? Date.now)() - started);
    return {
      url: current.toString(),
      status: response.status,
      contentType,
      bytes: response.bytes,
      redirects,
      elapsedMs,
      ...analyzeSeoDocument({ url: current.toString(), status: response.status, headers: response.headers, body: response.body, bytes: response.bytes, redirects, elapsedMs }),
    };
  }
}

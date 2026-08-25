import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const fingerprint = (id) => createHash("sha256").update(id).digest("hex").slice(0, 16);
const alwaysUnsafe = new Set(["javascript:", "data:", "vbscript:", "file:", "blob:"]);
const urlField = /(url|uri|href|link|website|redirect|store|audio|document)/i;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const findings = [];

function inspectString(qr, path, raw) {
  const value = raw.trim();
  const scheme = value.match(/^([a-z][a-z0-9+.-]*:)/i)?.[1].toLowerCase() ?? null;
  if (scheme && alwaysUnsafe.has(scheme)) {
    findings.push({ qr: fingerprint(qr.id), type: qr.qr_type, path, issue: "executable_or_local_scheme", scheme });
    return;
  }

  const appStoreScoped = qr.qr_type === "appstore" || qr.dynamic_content?.kind === "appstore";
  const allowedScheme = scheme === "http:" || scheme === "https:" || (appStoreScoped && (scheme === "itms-apps:" || scheme === "market:"));
  const mustBeUrl = path === "ab_test_url"
    || path.startsWith("rules.")
    || path.startsWith("document_urls.")
    || (path === "target_url" && ["url", "product"].includes(qr.qr_type))
    || urlField.test(path.split(".").at(-1) ?? "");

  if (mustBeUrl && scheme && !allowedScheme) {
    findings.push({ qr: fingerprint(qr.id), type: qr.qr_type, path, issue: "unsupported_scheme", scheme });
    return;
  }
  if (mustBeUrl && allowedScheme) {
    try {
      new URL(value);
    } catch {
      findings.push({ qr: fingerprint(qr.id), type: qr.qr_type, path, issue: "malformed_url", scheme });
    }
  }
}

function walk(qr, path, value) {
  if (typeof value === "string") return inspectString(qr, path, value);
  if (Array.isArray(value)) return value.forEach((item, index) => walk(qr, `${path}.${index}`, item));
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(qr, path ? `${path}.${key}` : key, child);
  }
}

let scanned = 0;
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id,qr_type,target_url,document_urls,dynamic_content,rules,ab_test_url")
    .order("id")
    .range(from, from + 999);
  if (error) throw error;
  for (const qr of data) {
    scanned += 1;
    walk(qr, "target_url", qr.target_url);
    walk(qr, "document_urls", qr.document_urls);
    walk(qr, "dynamic_content", qr.dynamic_content);
    walk(qr, "rules", qr.rules);
    walk(qr, "ab_test_url", qr.ab_test_url);
  }
  if (data.length < 1000) break;
}

console.log(JSON.stringify({
  mode: "READ_ONLY",
  scannedQrCodes: scanned,
  findingCount: findings.length,
  findings,
  policy: "No values were changed or printed. Review each fingerprint before a separately approved remediation.",
}, null, 2));

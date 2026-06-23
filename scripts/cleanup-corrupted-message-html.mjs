// Eski regex tabanlı sanitizeHtml(), "<b style=\"\">" gibi attribute taşıyan
// etiketleri tanıyamadığı için bunları literal "&lt;b style=&quot;&quot;&gt;"
// metnine çevirip admin_messages.body/title kolonlarına o haliyle yazmıştı.
// lib/utils/htmlSanitizer.ts artık sanitize-html ile düzeltildi (bkz. commit),
// ama DB'de zaten yazılmış bozuk kayıtlar kendiliğinden düzelmez.
//
// Bu script: "&lt;" + (izin verilen etiket adı) deseni içeren satırları tespit
// eder, bir kez HTML-entity decode edip yeni sanitizeHtml() ile yeniden
// temizler. Desen yoksa satıra dokunmaz. İdempotent: ikinci çalıştırmada
// (artık bozuk desen kalmadığı için) hiçbir satır güncellenmez.
//
// Kullanım: node scripts/cleanup-corrupted-message-html.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { decode } from "html-entities";
import sanitizeHtmlLib from "sanitize-html";
import fs from "fs";
import path from "path";
import { assertProdWriteAllowed } from "./lib/prod-write-guard.mjs";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const ALLOWED_TAGS = ["b", "i", "u", "strong", "em", "p", "br", "span", "ul", "ol", "li", "img"];

function trustedImagePrefix() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/`;
}

function sanitizeHtml(input) {
  if (!input) return "";
  const trustedPrefix = trustedImagePrefix();
  return sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { img: ["src", "alt"] },
    allowedSchemesByTag: { img: ["https"] },
    exclusiveFilter: (frame) => {
      if (frame.tag !== "img") return false;
      const src = frame.attribs.src ?? "";
      return !trustedPrefix || !src.startsWith(trustedPrefix);
    },
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          src: attribs.src ?? "",
          alt: attribs.alt ?? "",
          style: "max-width:100%;border-radius:8px;display:block;margin:8px 0;",
        },
      }),
    },
    disallowedTagsMode: "discard",
  });
}

const CORRUPTION_PATTERN = new RegExp(
  `&lt;/?(?:${ALLOWED_TAGS.join("|")})\\b`,
  "i"
);

function repair(value) {
  if (!value || !CORRUPTION_PATTERN.test(value)) return value;
  return sanitizeHtml(decode(value));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik (.env.local).");
    process.exit(1);
  }
  if (!dryRun) assertProdWriteAllowed("cleanup-corrupted-message-html.mjs", { supabaseUrl: url });
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error } = await sb.from("admin_messages").select("id, title, body");
  if (error) {
    console.error("admin_messages okunamadı:", error.message);
    process.exit(1);
  }

  let checked = 0;
  let fixed = 0;
  for (const row of rows ?? []) {
    checked++;
    const newTitle = repair(row.title);
    const newBody = repair(row.body);
    if (newTitle === row.title && newBody === row.body) continue;

    fixed++;
    console.log(`[id=${row.id}] title: ${JSON.stringify(row.title)} -> ${JSON.stringify(newTitle)}`);
    console.log(`[id=${row.id}] body:  ${JSON.stringify(row.body)} -> ${JSON.stringify(newBody)}`);

    if (!dryRun) {
      const { error: updateError } = await sb
        .from("admin_messages")
        .update({ title: newTitle, body: newBody })
        .eq("id", row.id);
      if (updateError) console.error(`[id=${row.id}] güncelleme hatası:`, updateError.message);
    }
  }

  console.log(`\n${checked} kayıt tarandı, ${fixed} kayıt ${dryRun ? "düzeltilecekti (dry-run)" : "düzeltildi"}.`);
}

main();

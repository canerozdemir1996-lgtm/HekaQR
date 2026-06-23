// Salt-okunur tarama: prod DB'de görev tanımında bahsedilen test artıklarını
// (test@test.com hesabı, "Test"/"ascasscascasc" gibi anlamsız admin_messages
// kayıtları) listeler. HİÇBİR ŞEYİ SİLMEZ — onay için rapor üretir.
// Kullanım: node scripts/find-test-data.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  const envPath = ".env.local";
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Açıkça anlamsız/feature-test içerikler — gerçek bir kullanıcıya gönderilmiş
// olabilecek hiçbir gerçek operasyonel duyuruyla örtüşmüyor.
const HIGH_CONFIDENCE_JUNK_BODIES = new Set([
  "Test Mesajı",
  "ascasscascasc",
  "asdasda",
  "asdadasd",
  "selam",
  "Selam",
  "Selammm",
  "HELLOOOO",
  "WOOW",
  "<div>asda</div>",
  "Bu mesajı sadece enterprise kullanıcılar görecek !",
  "bu mesaj starter içindir",
]);

function plainText(html) {
  return (html ?? "").replace(/<[^>]+>/g, "").trim();
}

async function main() {
  console.log("=== 1) Email'inde 'test' geçen auth kullanıcıları ===");
  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (usersPage?.users ?? []).filter((u) => (u.email ?? "").toLowerCase().includes("test"));
  for (const u of testUsers) {
    console.log(`- ${u.id} | ${u.email} | role=${u.user_metadata?.role} | full_name=${u.user_metadata?.full_name} | created=${u.created_at} | last_sign_in=${u.last_sign_in_at ?? "hiç"}`);
  }
  if (testUsers.length === 0) console.log("(yok)");

  console.log("\n=== 2) Yüksek güvenle 'test/anlamsız' admin_messages (silinmeye aday) ===");
  const { data: msgs } = await sb
    .from("admin_messages")
    .select("id, title, body, audience_type, to_user_id, created_at")
    .order("created_at", { ascending: false });

  const junk = [];
  const ambiguous = [];
  for (const m of msgs ?? []) {
    const text = plainText(m.body);
    if (HIGH_CONFIDENCE_JUNK_BODIES.has(text) || HIGH_CONFIDENCE_JUNK_BODIES.has(m.title ?? "")) {
      junk.push(m);
    } else if (/\btest\b/i.test(text) || /\btest\b/i.test(m.title ?? "")) {
      ambiguous.push(m);
    }
  }

  for (const m of junk) {
    console.log(`- [SİL] ${m.id} | ${m.created_at} | title=${JSON.stringify(m.title)} | body=${JSON.stringify(plainText(m.body).slice(0, 60))} | audience=${m.audience_type}`);
  }
  console.log(`Toplam: ${junk.length} kayıt`);

  console.log("\n=== 3) Belirsiz (başlık/içerikte 'test' geçiyor ama gerçek duyuru olabilir — OTOMATİK SİLİNMEYECEK) ===");
  for (const m of ambiguous) {
    console.log(`- [İNCELE] ${m.id} | ${m.created_at} | title=${JSON.stringify(m.title)} | body=${JSON.stringify(plainText(m.body).slice(0, 80))} | audience=${m.audience_type}`);
  }
  if (ambiguous.length === 0) console.log("(yok)");

  console.log(`\nÖzet: ${testUsers.length} test kullanıcı, ${junk.length} yüksek-güven test mesajı, ${ambiguous.length} belirsiz mesaj.`);
  console.log("Silme işlemi için: CONFIRM_PROD_WRITE=yes node scripts/delete-test-data.mjs");
}

main();

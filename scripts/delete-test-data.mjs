// scripts/find-test-data.mjs raporundaki "yüksek güven" listeyi siler:
//   1. test@test.com auth kullanıcısı (+ varsa user_settings/qr_codes/admin_messages
//      satırları onun user_id'sine bağlıysa)
//   2. Anlamsız/feature-test admin_messages kayıtları (find-test-data.mjs ile
//      AYNI HIGH_CONFIDENCE_JUNK_BODIES listesi — iki dosya senkron kalsın diye
//      tek kaynağa taşınmadı çünkü liste küçük ve değişmeyecek; ileride
//      büyürse ortak bir lib/test-data-classifier.mjs'e çıkarılabilir).
// "Belirsiz" (QR kod sistemimiz Test aşamasına geçmiştir... vb.) kayıtlara
// DOKUNULMAZ — gerçek operasyonel duyuru olabilirler.
//
// İdempotent: ikinci çalıştırmada satırlar artık yok, 0 silinir.
// Kullanım: CONFIRM_PROD_WRITE=yes node scripts/delete-test-data.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { assertProdWriteAllowed } from "./lib/prod-write-guard.mjs";

function loadEnv() {
  const envPath = ".env.local";
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik (.env.local).");
    process.exit(1);
  }
  assertProdWriteAllowed("delete-test-data.mjs", { supabaseUrl: url });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Test kullanıcısı
  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (usersPage?.users ?? []).filter((u) => (u.email ?? "").toLowerCase() === "test@test.com");
  for (const u of testUsers) {
    console.log(`Siliniyor: auth user ${u.id} (${u.email})`);
    await sb.from("user_settings").delete().eq("user_id", u.id);
    await sb.from("qr_codes").delete().eq("user_id", u.id);
    await sb.from("admin_messages").delete().or(`to_user_id.eq.${u.id},from_user_id.eq.${u.id}`);
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (error) console.error(`  auth.admin.deleteUser hata: ${error.message}`);
    else console.log(`  silindi.`);
  }
  if (testUsers.length === 0) console.log("test@test.com bulunamadı (zaten silinmiş olabilir).");

  // 2) Anlamsız admin_messages
  const { data: msgs } = await sb.from("admin_messages").select("id, title, body");
  const toDelete = (msgs ?? [])
    .filter((m) => HIGH_CONFIDENCE_JUNK_BODIES.has(plainText(m.body)) || HIGH_CONFIDENCE_JUNK_BODIES.has(m.title ?? ""))
    .map((m) => m.id);

  if (toDelete.length === 0) {
    console.log("Silinecek test mesajı yok.");
  } else {
    const { error } = await sb.from("admin_messages").delete().in("id", toDelete);
    if (error) console.error("admin_messages silme hatası:", error.message);
    else console.log(`${toDelete.length} test mesajı silindi.`);
  }
}

main();

// Bu projede ayrı bir "local" veya "staging" Supabase projesi yok — .env.local
// her zaman PRODUCTION'a işaret ediyor (test@test.com hesabı ve "Test Mesajı"
// gibi içeriklerin prod DB'de birikmesi de buradan kaynaklandı: bir ajan/geliştirici
// test scripti çalıştırdı, hedef her zaman canlı veritabanıydı).
//
// Yazma yapan (insert/update/delete) her script bu guard'ı en üstte çağırmalı.
// Varsayılan davranış: ENGELLE. Sadece CONFIRM_PROD_WRITE=yes açıkça verildiğinde
// devam eder — yanlışlıkla "node scripts/x.mjs" çalıştırmak güvenli bir no-op olur.
export function assertProdWriteAllowed(scriptName, { supabaseUrl } = {}) {
  const target = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(bilinmiyor)";

  if (process.env.CONFIRM_PROD_WRITE !== "yes") {
    console.error(`\n[${scriptName}] DURDURULDU: bu script production veritabanına yazıyor.`);
    console.error(`Hedef: ${target}`);
    console.error(`Yanlışlıkla canlı veriyi değiştirmemek için varsayılan olarak engellidir.`);
    console.error(`Bilerek çalıştırmak için:\n  CONFIRM_PROD_WRITE=yes node ${scriptName}\n`);
    process.exit(1);
  }

  console.warn(`[${scriptName}] CONFIRM_PROD_WRITE=yes verildi, ${target} üzerinde yazma işlemine devam ediliyor.`);
}

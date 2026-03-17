// Terminalde çalıştır: node test-connection.mjs
// .env.local'i okur ve Supabase'e bağlanabilir mi test eder

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// .env.local oku
let url, anonKey, serviceKey;
try {
  const env = readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=');
    const val = v.join('=').trim();
    if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = val;
    if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = val;
    if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = val;
  }
} catch {
  console.error('❌ .env.local okunamadı!');
  process.exit(1);
}

console.log('\n📋 Env Değerleri:');
console.log('  URL      :', url?.slice(0, 40) + '...' || '❌ EKSİK');
console.log('  ANON KEY :', anonKey?.slice(0, 30) + '...' || '❌ EKSİK');
console.log('  SVC KEY  :', serviceKey?.slice(0, 30) + '...' || '❌ EKSİK');

if (!url || !anonKey) {
  console.error('\n❌ URL veya ANON_KEY eksik!');
  process.exit(1);
}

console.log('\n🔌 Supabase bağlantısı test ediliyor...');
try {
  const sb = createClient(url, anonKey);
  const { data, error } = await sb.from('qr_codes').select('count').limit(1);
  if (error) {
    console.log('⚠️  Sorgu hatası (tablo yoksa normal):', error.message);
  } else {
    console.log('✅ Bağlantı başarılı! qr_codes tablosu erişilebilir.');
  }
  
  // Auth test
  const { data: { session } } = await sb.auth.getSession();
  console.log('✅ Auth servisi çalışıyor. Session:', session ? 'var' : 'yok (normal)');
} catch (e) {
  console.error('❌ Bağlantı hatası:', e.message);
  console.log('\n💡 Olası nedenler:');
  console.log('   1. Supabase projesi "paused" durumda (dashboard\'dan kontrol edin)');
  console.log('   2. Sunucudan supabase.co\'ya giden bağlantı engelleniyor');
  console.log('   3. API key yanlış');
}

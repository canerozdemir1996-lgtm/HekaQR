-- ================================================================
-- TEST KURULUMU - SUPABASE SQL EDITOR'DA ÇALIŞTIRıN
-- ================================================================

-- İlk önce ana SQL'i çalıştırın:
-- 1. Supabase Dashboard > SQL Editor
-- 2. COMPLETE_DATABASE_SETUP.sql dosyasını yapıştırın ve çalıştırın
-- 3. Ardından bu dosyadaki SQL kodlarını çalıştırın

-- ================================================================
-- BÖLÜM 1: TEST KULLANICICISI EKLE
-- ================================================================
-- Şifre: test123 (Supabase otomatik olarak hashleyecek)

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Doğrulama: Test kullanıcısını listele
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'test@example.com';

-- ================================================================
-- BÖLÜM 2: TEST VERİSİ EKLE (QR KODLAR)
-- ================================================================

-- Önce test kullanıcısının ID'sini al (yukarıdaki SELECT sonucundan)
-- Aşağıdaki YOUR_USER_ID'yi gerçek ID ile değiştir

-- Test QR kodları ekle
INSERT INTO public.qr_codes (
  user_id,
  title,
  short_slug,
  target_url,
  qr_type,
  is_active,
  scan_count,
  tags
) VALUES
  (
    (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1),
    'Google Sitesi',
    'google-' || substr(gen_random_uuid()::text, 1, 8),
    'https://google.com',
    'url',
    true,
    45,
    ARRAY['test', 'search']
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1),
    'GitHub Profili',
    'github-' || substr(gen_random_uuid()::text, 1, 8),
    'https://github.com',
    'url',
    true,
    23,
    ARRAY['test', 'code']
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1),
    'LinkedIn',
    'linkedin-' || substr(gen_random_uuid()::text, 1, 8),
    'https://linkedin.com',
    'url',
    false,
    0,
    ARRAY['test', 'social']
  );

-- Doğrulama: Test verilerini kontrol et
SELECT 
  id,
  title,
  short_slug,
  is_active,
  scan_count,
  created_at
FROM public.qr_codes
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1)
ORDER BY created_at DESC;

-- ================================================================
-- BÖLÜM 3: İSTATİSTİKLER İÇİN SCAN LOG'U EKLE
-- ================================================================

-- Scan logs ekle (istatistiklerin doğru çalışması için)
INSERT INTO public.scan_logs (qr_id, device, os)
SELECT 
  id,
  'desktop',
  'Windows'
FROM public.qr_codes
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1)
LIMIT 3;

-- ================================================================
-- BÖLÜM 4: USER SETTINGS EKLE (OPTIONAL)
-- ================================================================

INSERT INTO public.user_settings (
  user_id,
  theme,
  notifications_enabled,
  language
) 
SELECT 
  id,
  'dark',
  true,
  'tr'
FROM auth.users 
WHERE email = 'test@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- BÖLÜM 5: DOĞRULAMA SORGULARI
-- ================================================================

-- Yaşayan tüm tabloları kontrol et
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Toplam QR sayısı
SELECT COUNT(*) as toplam_qr FROM public.qr_codes;

-- Aktif QR'lar
SELECT COUNT(*) as aktif_qr FROM public.qr_codes WHERE is_active = true;

-- Test kullanıcısının QR kodları
SELECT 
  COUNT(*) as test_user_qr,
  SUM(scan_count) as toplam_scan
FROM public.qr_codes
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1);

-- ================================================================
-- BÖLÜM 6: TAMAMLAMA
-- ================================================================
-- Aşağıdaki komutu çalıştırarak RLS'yi test et
SELECT * FROM public.qr_codes LIMIT 1;

-- ================================================================
-- SORULAR?
-- ================================================================
-- 1. "error: permission denied" → RLS politikaları yanlış (COMPLETE_DATABASE_SETUP.sql tekrar çalıştır)
-- 2. "duplicate key value" → Test kullanıcısı zaten var (LIMIT 1 kaldır)
-- 3. Hiç veri görünmüyor → Scan_logs tablosunda yeterli veri yok (insert satırlarını tekrar çalıştır)

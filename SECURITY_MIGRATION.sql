-- ================================================================
--  QR HUB — Güvenlik (RLS) düzeltme migrasyonu
--  Supabase → SQL Editor → Yeni sorgu → Çalıştır
--  Not: Bu dosya mevcut kurulu sistemler içindir. MIGRATION.sql'i tekrar çalıştırmadan,
--  sadece politikaları günceller.
-- ================================================================

-- Scan logs: eski politikayı kaldır
DROP POLICY IF EXISTS "scan_read" ON scan_logs;

-- Kullanıcı sadece kendi QR'larının taramalarını görür
CREATE POLICY "scan_read" ON scan_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM qr_codes q
    WHERE q.id = scan_logs.qr_id
      AND q.user_id = auth.uid()
  ));


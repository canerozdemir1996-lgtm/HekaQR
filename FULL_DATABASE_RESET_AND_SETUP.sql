-- ================================================================
-- HEKA QR - FULL DATABASE RESET AND SETUP
-- 1) Çalıştırmadan önce yedekleyin.
-- 2) Bu script tüm tablo ve fonksiyonları yeniden oluşturur.
-- 3) Supabase SQL Editor veya psql ile çalıştırılabilir.
-- ================================================================

-- DROP / RESET (Supabase auth dahil tüm veriler silinir)

-- Supabase auth kullanıcılarını ve ilişkili tabloları sıfırla
-- Dikkat: auth kullanıcılarını silmek sistemin login/registration işlemini resetler.
TRUNCATE TABLE auth.users CASCADE;
TRUNCATE TABLE auth.refresh_tokens CASCADE;
TRUNCATE TABLE auth.providers CASCADE;
TRUNCATE TABLE auth.mfa_enrollments CASCADE;
TRUNCATE TABLE auth.sessions CASCADE;

-- Storage içeriğini tamamen temizle (bucket'ler kalır)
DELETE FROM storage.objects;
DELETE FROM storage.buckets WHERE name != 'avatars'; -- opsiyonel; eğer bucket da silinsin istiyorsanız filtreyi kaldırın

DROP POLICY IF EXISTS "styles_read" ON qr_styles;
DROP POLICY IF EXISTS "styles_write" ON qr_styles;
DROP POLICY IF EXISTS "qr_owner" ON qr_codes;
DROP POLICY IF EXISTS "qr_anon_read" ON qr_codes;
DROP POLICY IF EXISTS "scan_read" ON scan_logs;
DROP POLICY IF EXISTS "scan_insert" ON scan_logs;
DROP POLICY IF EXISTS "folder_owner" ON qr_folders;
DROP POLICY IF EXISTS "settings_owner" ON user_settings;
DROP POLICY IF EXISTS "api_keys_owner" ON api_keys;
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

DROP TABLE IF EXISTS scan_logs CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS qr_styles CASCADE;
DROP TABLE IF EXISTS qr_folders CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS user_mfa_settings CASCADE;

DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;

-- CORE SCHEMA
CREATE TABLE qr_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  short_slug text NOT NULL CONSTRAINT uq_qr_slug UNIQUE,
  target_url text NOT NULL,
  qr_type text NOT NULL DEFAULT 'url'
    CHECK (qr_type IN ('url','product','vcard','wifi','sms','email','whatsapp','text','phone','event','location','document','audio','coupon','feedback')),
  is_active boolean NOT NULL DEFAULT true,
  scan_count integer NOT NULL DEFAULT 0,
  style_id uuid REFERENCES qr_styles(id) ON DELETE SET NULL,
  pixel_id text,
  pixel_enabled boolean NOT NULL DEFAULT false,
  password text,
  scan_limit integer,
  expires_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  redirect_type text NOT NULL DEFAULT '302',
  ab_test_url text,
  ab_test_weight integer DEFAULT 50,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  vcard_data jsonb
);

CREATE UNIQUE INDEX idx_qr_slug_ci ON qr_codes (lower(short_slug));
CREATE INDEX idx_qr_user ON qr_codes (user_id);
CREATE INDEX idx_qr_active ON qr_codes (is_active);
CREATE INDEX idx_qr_created ON qr_codes (created_at DESC);

CREATE TABLE scan_logs (
  id bigserial PRIMARY KEY,
  qr_id uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  device text,
  os text,
  user_agent text,
  country text,
  city text,
  ip_hash text
);

CREATE INDEX idx_scan_qr ON scan_logs (qr_id);
CREATE INDEX idx_scan_date ON scan_logs (scanned_at DESC);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_qr_updated
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE qr_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "styles_read" ON qr_styles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "styles_write" ON qr_styles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qr_owner" ON qr_codes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "qr_anon_read" ON qr_codes FOR SELECT TO anon USING (true);

CREATE POLICY "scan_read" ON scan_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM qr_codes q WHERE q.id = scan_logs.qr_id AND q.user_id = auth.uid()));
CREATE POLICY "scan_insert" ON scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- FEATURES
CREATE TABLE IF NOT EXISTS qr_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_folders_user ON qr_folders (user_id);
ALTER TABLE qr_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folder_owner" ON qr_folders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_domain text,
  ga4_measurement_id text,
  gtm_container_id text,
  webhook_url text,
  avatar_url text,
  tracking_enabled boolean DEFAULT true,
  anomaly_detection_enabled boolean DEFAULT true,
  anomaly_alert_threshold integer DEFAULT 100,
  conversion_tracking_enabled boolean DEFAULT false,
  retention_days integer DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_owner" ON user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_owner" ON api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text CHECK (mfa_method IN ('totp', 'sms', 'email')) DEFAULT 'totp',
  totp_secret text,
  totp_verified boolean DEFAULT false,
  totp_backup_codes text[],
  phone_number text,
  phone_verified boolean DEFAULT false,
  email_backup_verified boolean DEFAULT false,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id)
);

-- ================================================================
--  QR HUB v9 — TAM VERİTABANI KURULUM
--  Supabase → SQL Editor → Yeni sorgu → Yapıştır → Çalıştır
-- ================================================================

DROP TABLE   IF EXISTS scan_logs  CASCADE;
DROP TABLE   IF EXISTS qr_codes   CASCADE;
DROP TABLE   IF EXISTS qr_styles  CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;

-- 1. Stiller
CREATE TABLE qr_styles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  config     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. QR Kodları
CREATE TABLE qr_codes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title          text        NOT NULL,
  short_slug     text        NOT NULL CONSTRAINT uq_qr_slug UNIQUE,
  target_url     text        NOT NULL,
  qr_type        text        NOT NULL DEFAULT 'url'
                 CHECK (qr_type IN ('url','vcard','wifi','sms','email','whatsapp','text','phone')),
  is_active      boolean     NOT NULL DEFAULT true,
  scan_count     integer     NOT NULL DEFAULT 0,
  style_id       uuid        REFERENCES qr_styles(id) ON DELETE SET NULL,
  pixel_id       text,
  pixel_enabled  boolean     NOT NULL DEFAULT false,
  password       text,
  scan_limit     integer,
  expires_at     timestamptz,
  utm_source     text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  redirect_type  text        NOT NULL DEFAULT '302',
  ab_test_url    text,
  ab_test_weight integer     DEFAULT 50,
  tags           text[]      NOT NULL DEFAULT '{}',
  notes          text,
  vcard_data     jsonb
);

CREATE UNIQUE INDEX idx_qr_slug_ci  ON qr_codes (lower(short_slug));
CREATE        INDEX idx_qr_user     ON qr_codes (user_id);
CREATE        INDEX idx_qr_active   ON qr_codes (is_active);
CREATE        INDEX idx_qr_created  ON qr_codes (created_at DESC);

-- 3. Tarama Logları
CREATE TABLE scan_logs (
  id          bigserial   PRIMARY KEY,
  qr_id       uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  device      text,
  os          text,
  user_agent  text,
  country     text,
  city        text,
  ip_hash     text
);

CREATE INDEX idx_scan_qr      ON scan_logs (qr_id);
CREATE INDEX idx_scan_date    ON scan_logs (scanned_at DESC);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_qr_updated
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 5. RLS
ALTER TABLE qr_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Stiller: herkes okur, auth yazar
CREATE POLICY "styles_read"  ON qr_styles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "styles_write" ON qr_styles FOR ALL    TO authenticated       USING (true) WITH CHECK (true);

-- QR Kodlar: sahip tüm işlemleri yapar; anon sadece redirect için okur
CREATE POLICY "qr_owner" ON qr_codes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "qr_anon_read" ON qr_codes FOR SELECT TO anon USING (true);

-- Scan logs
CREATE POLICY "scan_read"   ON scan_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "scan_insert" ON scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ================================================================
--  Admin kullanıcı oluşturma:
--  1. Supabase Dashboard -> Auth -> Users -> Add User
--  2. Kullaniciyi olusturun (e-posta + sifre)
--  3. Asagidaki SQL'i calistirin (e-posta adresini degistirin):
--
--     UPDATE auth.users
--     SET raw_user_meta_data =
--       jsonb_build_object('role','admin','full_name','Admin Adı')
--     WHERE email = 'admin@yourdomain.com';
--
--  4. /login adresine gidin, admin ile giris yapin
--  5. /admin adresine yonlendirilirsiniz
--
--  .env.local:
--    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
--    SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
-- ================================================================

-- ================================================================
--  HEKA QR - COMPLETE DATABASE SETUP
--  Supabase SQL Editor'da çalıştırın
--  
--  Bu dosya tüm migration ve setup SQL kodlarını
--  organize edilmiş şekilde içerir.
-- ================================================================

-- ##################################################################
-- SECTION 1: CORE SCHEMA (MIGRATION.sql)
-- ##################################################################

DROP TABLE   IF EXISTS scan_logs  CASCADE;
DROP TABLE   IF EXISTS qr_codes   CASCADE;
DROP TABLE   IF EXISTS qr_styles  CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;

-- 1.1. QR Styles Table
CREATE TABLE qr_styles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  config     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2. QR Codes Table
CREATE TABLE qr_codes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title          text        NOT NULL,
  short_slug     text        NOT NULL CONSTRAINT uq_qr_slug UNIQUE,
  target_url     text        NOT NULL,
  qr_type        text        NOT NULL DEFAULT 'url'
                 CHECK (qr_type IN ('url','product','vcard','wifi','sms','email','whatsapp','text','phone','event','location','document','audio','coupon','feedback')),
  is_active      boolean     NOT NULL DEFAULT true,
  scan_count     integer     NOT NULL DEFAULT 0,
  style_id       uuid        REFERENCES qr_styles(id) ON DELETE SET NULL,
  pixel_id       text,
  pixel_enabled  boolean     NOT NULL DEFAULT false,
  password       text,
  scan_limit     integer,
  expires_at     timestamptz,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
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

-- 1.3. Scan Logs Table
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

-- 1.4. Updated At Trigger Function
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_qr_updated
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 1.5. Enable RLS on Core Tables
ALTER TABLE qr_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- 1.6. RLS Policies - QR Styles
DROP POLICY IF EXISTS "styles_read" ON qr_styles;
CREATE POLICY "styles_read"  ON qr_styles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "styles_write" ON qr_styles;
CREATE POLICY "styles_write" ON qr_styles FOR ALL    TO authenticated       USING (true) WITH CHECK (true);

-- 1.7. RLS Policies - QR Codes
DROP POLICY IF EXISTS "qr_owner" ON qr_codes;
CREATE POLICY "qr_owner" ON qr_codes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "qr_anon_read" ON qr_codes;
CREATE POLICY "qr_anon_read" ON qr_codes FOR SELECT TO anon USING (true);

-- 1.8. RLS Policies - Scan Logs
DROP POLICY IF EXISTS "scan_read" ON scan_logs;
CREATE POLICY "scan_read" ON scan_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = scan_logs.qr_id AND q.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "scan_insert" ON scan_logs;
CREATE POLICY "scan_insert" ON scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);


-- ##################################################################
-- SECTION 2: FEATURES (FEATURES_MIGRATION.sql)
-- ##################################################################

-- 2.1. Folders/Campaigns Table
CREATE TABLE IF NOT EXISTS qr_folders (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folders_user ON qr_folders (user_id);

ALTER TABLE qr_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "folder_owner" ON qr_folders;
CREATE POLICY "folder_owner" ON qr_folders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2.2. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_domain    text,
  ga4_measurement_id text,
  gtm_container_id text,
  webhook_url      text,
  avatar_url       text,
  tracking_enabled boolean DEFAULT true,
  anomaly_detection_enabled boolean DEFAULT true,
  anomaly_alert_threshold integer DEFAULT 100,
  conversion_tracking_enabled boolean DEFAULT false,
  retention_days   integer DEFAULT 90,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_owner" ON user_settings;
CREATE POLICY "settings_owner" ON user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2.3. User Settings Updated At Trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_set_updated_at') THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_settings_updated ON user_settings;
      CREATE TRIGGER trg_settings_updated
        BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2.4. QR Codes Enhancements
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES qr_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ga4_measurement_id text,
  ADD COLUMN IF NOT EXISTS gtm_container_id text,
  ADD COLUMN IF NOT EXISTS webhook_url text;

CREATE INDEX IF NOT EXISTS idx_qr_folder ON qr_codes (folder_id);

-- 2.4a. Scan Logs Enhancements (fingerprint for unique scans)
ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS fingerprint text;

CREATE INDEX IF NOT EXISTS idx_scan_fingerprint ON scan_logs (fingerprint);

-- 2.5. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  key_hash     text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_keys_owner" ON api_keys;
CREATE POLICY "api_keys_owner" ON api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ##################################################################
-- SECTION 3: STORAGE (AVATAR_STORAGE_MIGRATION.sql)
-- ##################################################################

-- 3.1. Create Avatar Bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 3.2. Avatar Storage RLS Policies
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);


-- ##################################################################
-- SECTION 4: MFA (Multi-Factor Authentication)
-- ##################################################################

-- 4.1. MFA Settings Table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method TEXT CHECK (mfa_method IN ('totp', 'sms', 'email')) DEFAULT 'totp',
  totp_secret TEXT,
  totp_verified BOOLEAN DEFAULT FALSE,
  totp_backup_codes TEXT[],
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_backup_verified BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(user_id)
);

-- 4.2. MFA Audit Log Table
CREATE TABLE IF NOT EXISTS mfa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4.3. MFA Backup Codes Table
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4.4. OAuth Sessions Table
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expire_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- 4.5. MFA RLS Policies
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own MFA settings" ON user_mfa_settings;
CREATE POLICY "Users can view own MFA settings"
  ON user_mfa_settings FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own MFA settings" ON user_mfa_settings;
CREATE POLICY "Users can update own MFA settings"
  ON user_mfa_settings FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own MFA settings" ON user_mfa_settings;
CREATE POLICY "Users can insert own MFA settings"
  ON user_mfa_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE mfa_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own MFA audit logs" ON mfa_audit_logs;
CREATE POLICY "Users can view own MFA audit logs"
  ON mfa_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own backup codes" ON mfa_backup_codes;
CREATE POLICY "Users can view own backup codes"
  ON mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own OAuth sessions" ON oauth_sessions;
CREATE POLICY "Users can view own OAuth sessions"
  ON oauth_sessions FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own OAuth sessions" ON oauth_sessions;
CREATE POLICY "Users can update own OAuth sessions"
  ON oauth_sessions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.6. MFA Indexes
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_id ON mfa_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_created_at ON mfa_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used ON mfa_backup_codes(used);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_provider ON oauth_sessions(provider);


-- ##################################################################
-- SECTION 5: DYNAMIC QR CODES
-- ##################################################################

-- 5.1. QR Codes Dynamic Fields
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS is_dynamic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_content jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS document_urls text[] DEFAULT '{}';

-- 5.2. Dynamic QR History Table
CREATE TABLE IF NOT EXISTS dynamic_qr_history (
  id              bigserial       PRIMARY KEY,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  old_content     jsonb           NOT NULL,
  new_content     jsonb           NOT NULL,
  changed_by      uuid            REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_qr_history ON dynamic_qr_history (qr_id, changed_at DESC);

ALTER TABLE dynamic_qr_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dynamic_history_read" ON dynamic_qr_history;
CREATE POLICY "dynamic_history_read" ON dynamic_qr_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = dynamic_qr_history.qr_id AND q.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "dynamic_history_insert" ON dynamic_qr_history;
CREATE POLICY "dynamic_history_insert" ON dynamic_qr_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 5.3. Dynamic Content Tracking Trigger
CREATE OR REPLACE FUNCTION fn_track_dynamic_content()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_dynamic = true AND NEW.dynamic_content IS NOT NULL THEN
    IF OLD.dynamic_content IS DISTINCT FROM NEW.dynamic_content THEN
      INSERT INTO dynamic_qr_history (qr_id, old_content, new_content, changed_by)
      VALUES (NEW.id, OLD.dynamic_content, NEW.dynamic_content, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_dynamic_qr_history ON qr_codes;
CREATE TRIGGER trg_dynamic_qr_history
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION fn_track_dynamic_content();

-- 5.4. Dynamic QR Index
CREATE INDEX IF NOT EXISTS idx_qr_dynamic ON qr_codes (is_dynamic, user_id) WHERE is_dynamic = true;


-- ##################################################################
-- SECTION 6: LOGO & FRAME DESIGN
-- ##################################################################

-- 6.1. QR Design Fields
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_design jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frame_style text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_transparent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_size_percent integer DEFAULT 30;

-- 6.2. QR Design Templates Table
CREATE TABLE IF NOT EXISTS qr_design_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL UNIQUE,
  description     text,
  design_config   jsonb       NOT NULL,
  frame_style     text,
  is_public       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO qr_design_templates (name, description, design_config, frame_style, is_public) VALUES
('Modern', 'Modern minimal tasarım', '{"bodyShape":"dots","cornerShape":"square","bodyColor":"#000000","cornerColor":"#000000","backgroundColor":"#ffffff","gradient":null}', 'default', true),
('Pro', 'Profesyonel ve temiz', '{"bodyShape":"square","cornerShape":"rounded","bodyColor":"#1e40af","cornerColor":"#1e40af","backgroundColor":"#ffffff","gradient":null}', 'professional', true),
('Vibrant', 'Renkli ve dinamik', '{"bodyShape":"dots","cornerShape":"circle","bodyColor":"#d946ef","cornerColor":"#f59e0b","backgroundColor":"#ffffff","gradient":{"color1":"#d946ef","color2":"#f59e0b","angle":45}}', 'fun', true),
('Dark Mode', 'Koyu tema', '{"bodyShape":"square","cornerShape":"square","bodyColor":"#ffffff","cornerColor":"#ffffff","backgroundColor":"#1f2937","gradient":null}', 'minimal', true),
('Retro', 'Retro stil', '{"bodyShape":"square","cornerShape":"square","bodyColor":"#0f172a","cornerColor":"#0f172a","backgroundColor":"#fef3c7","gradient":null}', 'retro', true)
ON CONFLICT (name) DO NOTHING;

-- 6.3. User QR Designs Table
CREATE TABLE IF NOT EXISTS user_qr_designs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  design_config   jsonb       NOT NULL,
  frame_style     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_designs ON user_qr_designs (user_id, created_at DESC);

-- 6.4. Design RLS Policies
ALTER TABLE qr_design_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_templates_public" ON qr_design_templates;
CREATE POLICY "design_templates_public" ON qr_design_templates
  FOR SELECT TO anon, authenticated USING (is_public = true);

ALTER TABLE user_qr_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_designs_own" ON user_qr_designs;
CREATE POLICY "user_designs_own" ON user_qr_designs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6.5. Design Indexes
CREATE INDEX IF NOT EXISTS idx_qr_design ON qr_codes (user_id) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_frame ON qr_codes (frame_style);


-- ##################################################################
-- SECTION 7: ADVANCED ANALYTICS
-- ##################################################################

-- 7.1. Conversion Events Table
CREATE TABLE IF NOT EXISTS conversion_events (
  id              bigserial       PRIMARY KEY,
  scan_log_id     bigint          REFERENCES scan_logs(id) ON DELETE SET NULL,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  event_type      text            NOT NULL,
  event_value     numeric(12,2),
  event_data      jsonb           DEFAULT '{}'::jsonb,
  tracked_at      timestamptz     NOT NULL DEFAULT now(),
  created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_qr ON conversion_events (qr_id, tracked_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_type ON conversion_events (event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_scan ON conversion_events (scan_log_id);

-- 7.2. Anomaly Logs Table
CREATE TABLE IF NOT EXISTS anomaly_logs (
  id              bigserial       PRIMARY KEY,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  anomaly_type    text            NOT NULL,
  severity        text            NOT NULL DEFAULT 'medium',
  details         jsonb           DEFAULT '{}'::jsonb,
  detected_at     timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_qr ON anomaly_logs (qr_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_severity ON anomaly_logs (severity);

-- 7.3. Cohort Data Table
CREATE TABLE IF NOT EXISTS cohort_data (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id           uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  cohort_date     date        NOT NULL,
  cohort_age      integer     NOT NULL,
  retention_count integer     NOT NULL DEFAULT 1,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_unique
  ON cohort_data (qr_id, cohort_date, cohort_age);
CREATE INDEX IF NOT EXISTS idx_cohort_date ON cohort_data (cohort_date DESC);

-- 7.4. Daily Summary Table
CREATE TABLE IF NOT EXISTS scan_daily_summary (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id           uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scan_date       date        NOT NULL,
  scan_count      integer     NOT NULL DEFAULT 0,
  unique_ips      integer     NOT NULL DEFAULT 0,
  unique_fingerprints integer NOT NULL DEFAULT 0,
  top_country     text,
  top_device      text,
  conversion_count integer     NOT NULL DEFAULT 0,
  avg_response_time_ms numeric(8,2),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_unique ON scan_daily_summary (qr_id, scan_date);
CREATE INDEX IF NOT EXISTS idx_daily_date ON scan_daily_summary (scan_date DESC);

-- 7.5. Analytics RLS Policies
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversion_read" ON conversion_events;
CREATE POLICY "conversion_read" ON conversion_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = conversion_events.qr_id AND q.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "conversion_insert" ON conversion_events;
CREATE POLICY "conversion_insert" ON conversion_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE anomaly_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anomaly_read" ON anomaly_logs;
CREATE POLICY "anomaly_read" ON anomaly_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = anomaly_logs.qr_id AND q.user_id = auth.uid()
  ));

ALTER TABLE cohort_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cohort_read" ON cohort_data;
CREATE POLICY "cohort_read" ON cohort_data
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = cohort_data.qr_id AND q.user_id = auth.uid()
  ));

ALTER TABLE scan_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_summary_read" ON scan_daily_summary;
CREATE POLICY "daily_summary_read" ON scan_daily_summary
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = scan_daily_summary.qr_id AND q.user_id = auth.uid()
  ));


-- ##################################################################
-- SECTION 8: ADMIN MESSAGES (System Owner Messaging)
-- ##################################################################

-- 8.1. Admin Messages Table
CREATE TABLE IF NOT EXISTS admin_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  from_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL DEFAULT 'System Owner',
  body         text        NOT NULL,
  popup_kind   text        NOT NULL DEFAULT 'small' CHECK (popup_kind IN ('small','big')),
  read_at      timestamptz,
  deleted_by_user_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_to_user_created
  ON admin_messages (to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_to_user_deleted
  ON admin_messages (to_user_id, deleted_by_user_at);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- 8.2. Admin Messages RLS Policies
DROP POLICY IF EXISTS "admin_messages_read_own" ON admin_messages;
CREATE POLICY "admin_messages_read_own" ON admin_messages
  FOR SELECT TO authenticated
  USING (to_user_id = auth.uid());

DROP POLICY IF EXISTS "admin_messages_mark_read" ON admin_messages;
CREATE POLICY "admin_messages_mark_read" ON admin_messages
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

DROP POLICY IF EXISTS "admin_messages_delete_own" ON admin_messages;


-- ##################################################################
-- SECTION 9: USER PRESENCE (Online/Offline Status)
-- ##################################################################

-- 9.1. User Presence Table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON user_presence (last_seen_at DESC);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- 9.2. User Presence RLS Policies
DROP POLICY IF EXISTS "presence_upsert_own" ON user_presence;
CREATE POLICY "presence_upsert_own" ON user_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ##################################################################
-- DOCUMENTATION & SETUP INSTRUCTIONS
-- ##################################################################

/*

╔════════════════════════════════════════════════════════════════════╗
║                    DATABASE SETUP COMPLETE!                       ║
╚════════════════════════════════════════════════════════════════════╝

Bu dosya Heka QR'nin tüm veritabanı tablolarını, ilişkilerini,
RLS politikalarını ve tetikleyicilerini içerir.

ADMIN USER OLUŞTURMA:
─────────────────────
1. Supabase Dashboard → Auth → Users → Add User
2. Email ve password ile kullanıcı oluşturun
3. Aşağıdaki SQL'i çalıştırın (USER_EMAIL'i değiştirin):

UPDATE auth.users
SET raw_user_meta_data = 
  jsonb_build_object('role','admin','full_name','Admin Adı')
WHERE email = 'admin@yourdomain.com';

SYSTEM OWNER OLUŞTURMA (isteğe bağlı):
──────────────────────────────────────
Admin'lerin birbirini banlamasını/rolünü değiştirmesini engeller.

UPDATE auth.users
SET raw_user_meta_data = 
  jsonb_build_object('role','owner','full_name','System Owner')
WHERE email = 'owner@yourdomain.com';

ORTAM DEĞİŞKENLERİ (.env.local):
─────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

VERİTABANI KONTROL:
──────────────────
Tüm tabloları görmek için:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

*/

-- ================================================================
--  QR HUB — v10 Feature Migration (non-destructive)
--  Supabase → SQL Editor → Yeni sorgu → Çalıştır
--  Not: Bu dosya mevcut kurulu sistemler içindir.
-- ================================================================

-- 1) Folders/Campaigns
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

-- 2) User settings (white-label + GA defaults)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_domain    text,
  ga4_measurement_id text,
  gtm_container_id text,
  webhook_url      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_owner" ON user_settings;
CREATE POLICY "settings_owner" ON user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at trigger for user_settings (reuse fn_set_updated_at if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_set_updated_at') THEN
    BEGIN
      CREATE TRIGGER trg_settings_updated
        BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;
  END IF;
END $$;

-- 3) QR enhancements: folder + routing rules + tracking ids + webhooks
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES qr_folders(id) ON DELETE SET NULL;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS ga4_measurement_id text;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS gtm_container_id text;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS webhook_url text;

CREATE INDEX IF NOT EXISTS idx_qr_folder ON qr_codes (folder_id);

-- 4) Scan logs: fingerprint for unique scans
ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS fingerprint text;

CREATE INDEX IF NOT EXISTS idx_scan_fingerprint ON scan_logs (fingerprint);

-- 5) API keys (for public API + automation)
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


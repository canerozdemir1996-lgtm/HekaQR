-- user_presence: heartbeat tablosu — dashboard kullanıcıları her 20 sn'de bir
-- Supabase anonim client üzerinden upsert eder (ClientProviders.tsx/UserHeartbeat).
-- Admin panelinde "son 5 dakikada görüldü" = online kabul edilir.

CREATE TABLE IF NOT EXISTS user_presence (
  user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Sadece kendi satırını okuyabilir / yazabilir
CREATE POLICY IF NOT EXISTS "user_presence_select_own"
  ON user_presence FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "user_presence_upsert_own"
  ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "user_presence_update_own"
  ON user_presence FOR UPDATE USING (auth.uid() = user_id);

-- service_role tüm satırlara erişebilir (admin panel)
GRANT ALL ON user_presence TO service_role;

-- Eski kayıtları temizlemek için index
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence (last_seen_at DESC);

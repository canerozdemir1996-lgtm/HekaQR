-- ================================================================
--  QR HUB — User Presence (Online/Offline)
--  Supabase → SQL Editor → Yeni sorgu → Çalıştır
-- ================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON user_presence (last_seen_at DESC);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Authenticated users can upsert/update their own presence row
DROP POLICY IF EXISTS "presence_upsert_own" ON user_presence;
CREATE POLICY "presence_upsert_own" ON user_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


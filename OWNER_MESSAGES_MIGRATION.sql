-- ================================================================
--  QR HUB — System Owner Popup Messages (Realtime)
--  Supabase → SQL Editor → Yeni sorgu → Çalıştır
-- ================================================================

-- 1) Messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  from_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL DEFAULT 'System Owner',
  body         text        NOT NULL,
  popup_kind   text        NOT NULL DEFAULT 'small' CHECK (popup_kind IN ('small','big')),
  read_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_to_user_created
  ON admin_messages (to_user_id, created_at DESC);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- 2) RLS policies
DROP POLICY IF EXISTS "admin_messages_read_own" ON admin_messages;
CREATE POLICY "admin_messages_read_own" ON admin_messages
  FOR SELECT TO authenticated
  USING (to_user_id = auth.uid());

-- Client can mark as read (best-effort)
DROP POLICY IF EXISTS "admin_messages_mark_read" ON admin_messages;
CREATE POLICY "admin_messages_mark_read" ON admin_messages
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Inserts should be done via server/service-role (API).
-- If you ever need DB-side inserts without service-role, create a dedicated function + SECURITY DEFINER.


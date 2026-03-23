-- ================================================================
--  QR HUB — Patch: admin_messages deleted_by_user_at
--  Run this ONCE on existing Supabase DBs
-- ================================================================

-- 1) Add soft-delete column (user hides message, admin still sees)
ALTER TABLE IF EXISTS public.admin_messages
  ADD COLUMN IF NOT EXISTS deleted_by_user_at timestamptz;

-- 2) Helpful index for filtering
CREATE INDEX IF NOT EXISTS idx_admin_messages_to_user_deleted
  ON public.admin_messages (to_user_id, deleted_by_user_at);

-- 3) Ensure clients cannot hard-delete rows
DROP POLICY IF EXISTS "admin_messages_delete_own" ON public.admin_messages;


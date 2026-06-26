-- restore_requests: owner'ın sistem geri yüklemesi için talep kaydı.
-- Gerçek restore GitHub Actions / harici script tarafından bu tablo izlenerek tetiklenir.
-- Tüm güvenlik kontrolleri (owner, 2FA) API katmanında yapılır.

CREATE TABLE IF NOT EXISTS restore_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_kind  text NOT NULL CHECK (backup_kind IN ('db', 'storage')),
  backup_label text NOT NULL,            -- "db-2026-06-26" gibi insan okunabilir etiket
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at   timestamptz,
  completed_at timestamptz,
  error        text,
  ip_address   text,
  notes        text
);

ALTER TABLE restore_requests ENABLE ROW LEVEL SECURITY;
-- Sadece service_role erişebilir
GRANT ALL ON restore_requests TO service_role;
REVOKE ALL ON restore_requests FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_restore_requests_owner ON restore_requests (owner_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_restore_requests_status ON restore_requests (status, requested_at DESC);

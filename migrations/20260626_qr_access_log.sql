-- qr_access_log: şifreli QR unlock denemelerini loglar (brute-force takibi).
-- Başarılı ve başarısız tüm denemeler kaydedilir; admin panelde görülebilir.

CREATE TABLE IF NOT EXISTS qr_access_log (
  id           bigserial PRIMARY KEY,
  qr_id        uuid REFERENCES qr_codes(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  ip_hash      text,
  user_agent   text,
  success      boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_access_log_slug_at
  ON qr_access_log (slug, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_access_log_ip
  ON qr_access_log (ip_hash, attempted_at DESC);

-- 90 günden eski kayıtları otomatik sil (opsiyonel, pg_cron ile)
-- SELECT cron.schedule('cleanup-qr-access-log', '0 3 * * *',
--   $$DELETE FROM qr_access_log WHERE attempted_at < now() - interval '90 days'$$);

ALTER TABLE qr_access_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON qr_access_log TO service_role;
REVOKE ALL ON qr_access_log FROM anon, authenticated;

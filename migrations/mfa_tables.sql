-- 2FA/TOTP servisi (lib/services/mfaService.ts) için gerekli tablolar.
-- user_mfa_settings prod'da zaten var olabilir (rls_hardening.sql onu referans alıyor) —
-- IF NOT EXISTS kullanıldığı için zaten varsa bu blok hiçbir şey yapmaz.

CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret text,
  totp_verified boolean NOT NULL DEFAULT false,
  mfa_enabled boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  mfa_method text DEFAULT 'totp',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON mfa_backup_codes(user_id);

CREATE TABLE IF NOT EXISTS mfa_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failure')),
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_created ON mfa_audit_logs(user_id, created_at DESC);

ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON user_mfa_settings FROM anon, authenticated;
REVOKE ALL ON mfa_backup_codes FROM anon, authenticated;
REVOKE ALL ON mfa_audit_logs FROM anon, authenticated;
GRANT ALL ON user_mfa_settings TO service_role;
GRANT ALL ON mfa_backup_codes TO service_role;
GRANT ALL ON mfa_audit_logs TO service_role;

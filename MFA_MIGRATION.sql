-- ─────────────────────────────────────────────────────────────
-- MFA (Multi-Factor Authentication) Schema
-- ─────────────────────────────────────────────────────────────

-- MFA Settings Table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method TEXT CHECK (mfa_method IN ('totp', 'sms', 'email')) DEFAULT 'totp',
  
  -- TOTP Specific
  totp_secret TEXT,
  totp_verified BOOLEAN DEFAULT FALSE,
  totp_backup_codes TEXT[], -- JSON array of hashed backup codes
  
  -- SMS/Email
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_backup_verified BOOLEAN DEFAULT FALSE,
  
  verified BOOLEAN DEFAULT FALSE, -- Overall MFA verified status
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,

  UNIQUE(user_id)
);

-- MFA Audit Log
CREATE TABLE IF NOT EXISTS mfa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'totp_generated', 'totp_verified', 'backup_code_used', 'mfa_disabled'
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success', -- 'success' or 'failure'
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backup Codes Table (for recovery)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- bcrypt hashed
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth Sessions (for multi-device management)
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'github', 'email'
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expire_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, provider, provider_account_id)
);

-- Row-Level Security Policies

-- MFA Settings: Users can only view/edit their own
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA settings"
  ON user_mfa_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings"
  ON user_mfa_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings"
  ON user_mfa_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- MFA Audit Logs: Users can view their own logs
ALTER TABLE mfa_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA audit logs"
  ON mfa_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Backup Codes: Users can view their own
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own backup codes"
  ON mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

-- OAuth Sessions: Users can view/update their own
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OAuth sessions"
  ON oauth_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth sessions"
  ON oauth_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for Performance
CREATE INDEX idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE INDEX idx_mfa_audit_logs_user_id ON mfa_audit_logs(user_id);
CREATE INDEX idx_mfa_audit_logs_created_at ON mfa_audit_logs(created_at);
CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_used ON mfa_backup_codes(used);
CREATE INDEX idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX idx_oauth_sessions_provider ON oauth_sessions(provider);

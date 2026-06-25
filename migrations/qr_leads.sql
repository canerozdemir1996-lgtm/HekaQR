CREATE TABLE IF NOT EXISTS qr_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  note text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_leads_user_created ON qr_leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_leads_qr_created ON qr_leads(qr_id, created_at DESC);

ALTER TABLE qr_leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_leads TO service_role;

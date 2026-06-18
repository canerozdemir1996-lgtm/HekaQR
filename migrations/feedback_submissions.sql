CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('complaint','suggestion','request','thanks')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','resolved','closed')),
  message text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  location_label text,
  location_data jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_created ON feedback_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_qr_created ON feedback_submissions(qr_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);

ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback_submissions TO service_role;

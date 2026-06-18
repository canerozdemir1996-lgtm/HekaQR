CREATE SEQUENCE IF NOT EXISTS enterprise_quote_number_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION next_enterprise_quote_number()
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT nextval('enterprise_quote_number_seq');
$$;

CREATE TABLE IF NOT EXISTS enterprise_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL,
  quote_number text NOT NULL,
  user_id uuid NULL,
  full_name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  note text NULL,
  dynamic_qr integer NOT NULL,
  menu_qr integer NOT NULL,
  vcard_pages integer NOT NULL,
  monthly_scans integer NOT NULL,
  team_members integer NOT NULL,
  white_label_domains integer NOT NULL,
  estimated_monthly_price integer NOT NULL,
  estimated_annual_price integer NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  billing_preference text NOT NULL CHECK (billing_preference IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'checkout_created', 'converted', 'rejected', 'expired')),
  source text NOT NULL DEFAULT 'enterprise_calculator',
  checkout_url text NULL,
  checkout_created_at timestamptz NULL,
  converted_at timestamptz NULL,
  provider_variant_id text NULL,
  provider_order_id text NULL,
  provider_subscription_id text NULL,
  request_ip_hash text NULL,
  is_spam boolean NOT NULL DEFAULT false,
  spam_reason text NULL,
  last_event_name text NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS enterprise_quotes_public_id_idx
  ON enterprise_quotes (public_id);

CREATE UNIQUE INDEX IF NOT EXISTS enterprise_quotes_quote_number_idx
  ON enterprise_quotes (quote_number);

CREATE INDEX IF NOT EXISTS enterprise_quotes_email_idx
  ON enterprise_quotes (email);

CREATE INDEX IF NOT EXISTS enterprise_quotes_status_idx
  ON enterprise_quotes (status);

CREATE INDEX IF NOT EXISTS enterprise_quotes_created_at_idx
  ON enterprise_quotes (created_at DESC);

CREATE INDEX IF NOT EXISTS enterprise_quotes_user_id_idx
  ON enterprise_quotes (user_id);

CREATE INDEX IF NOT EXISTS enterprise_quotes_subscription_idx
  ON enterprise_quotes (provider_subscription_id);

CREATE INDEX IF NOT EXISTS enterprise_quotes_order_idx
  ON enterprise_quotes (provider_order_id);

CREATE INDEX IF NOT EXISTS enterprise_quotes_ip_hash_idx
  ON enterprise_quotes (request_ip_hash, created_at DESC);

ALTER TABLE enterprise_quotes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enterprise_quotes'
      AND policyname = 'enterprise_quotes_own_select'
  ) THEN
    CREATE POLICY enterprise_quotes_own_select
      ON enterprise_quotes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

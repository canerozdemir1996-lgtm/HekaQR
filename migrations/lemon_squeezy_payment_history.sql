-- Lemon Squeezy payment history
-- Records every subscription-invoice event (success/failed/recovered/refunded)
-- idempotently, keyed by the provider's invoice id.

CREATE TABLE IF NOT EXISTS billing_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'lemon_squeezy',
  provider_invoice_id text NOT NULL,
  provider_subscription_id text,
  status text NOT NULL,
  amount integer,
  currency text,
  billed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_payment_history_provider_invoice_idx
  ON billing_payment_history (provider, provider_invoice_id);

CREATE INDEX IF NOT EXISTS billing_payment_history_user_idx
  ON billing_payment_history (user_id, billed_at DESC);

CREATE INDEX IF NOT EXISTS billing_payment_history_subscription_idx
  ON billing_payment_history (provider_subscription_id);

ALTER TABLE billing_payment_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_payment_history'
      AND policyname = 'billing_payment_history_own_select'
  ) THEN
    CREATE POLICY billing_payment_history_own_select
      ON billing_payment_history
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

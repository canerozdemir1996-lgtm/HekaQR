-- Lemon Squeezy billing tables
-- Normalized subscription storage + webhook idempotency log

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'lemon_squeezy',
  provider_subscription_id text NOT NULL,
  provider_customer_id text,
  provider_order_id text,
  provider_product_id text,
  provider_variant_id text,
  plan_key text NOT NULL,
  status text NOT NULL,
  billing_interval text NOT NULL DEFAULT 'monthly',
  currency text,
  amount integer,
  renews_at timestamptz,
  ends_at timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  card_brand text,
  card_last_four text,
  payment_processor text,
  pause jsonb,
  update_payment_method_url text,
  customer_portal_url text,
  test_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_idx
  ON subscriptions (provider, provider_subscription_id);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON subscriptions (user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text,
  provider_resource_id text,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  payload_hash text NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_provider_hash_idx
  ON billing_webhook_events (provider, payload_hash);

CREATE INDEX IF NOT EXISTS billing_webhook_events_created_idx
  ON billing_webhook_events (created_at DESC);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND policyname = 'subscriptions_own_select'
  ) THEN
    CREATE POLICY subscriptions_own_select
      ON subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Admin pricing configuration storage
-- Run once in Supabase SQL editor or via psql.
--
-- Stores all admin-managed pricing content as versioned JSONB rows.
-- Falls back to lib/pricing.ts defaults when empty.
--
-- Supported keys:
--   plans           => PlanDefinition[]
--   comparison      => ComparisonRow[]
--   enterprise      => EnterpriseSliderConfig[]
--   faq             => FaqItem[]
--   trust           => TrustItem[]

CREATE TABLE IF NOT EXISTS admin_pricing_config (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only service role (admin API) writes; no public read needed.
ALTER TABLE admin_pricing_config ENABLE ROW LEVEL SECURITY;

-- User plan / subscription fields on user_settings.
-- Tracks what plan is currently assigned, billing cycle, and subscription state.
-- Designed to later support in-product upgrades and feature gating.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS current_plan        TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_cycle       TEXT        NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at     TIMESTAMPTZ;

-- current_plan        : 'free' | 'starter' | 'pro' | 'enterprise'
-- billing_cycle       : 'monthly' | 'yearly'
-- subscription_status : 'free' | 'active' | 'trial' | 'expired' | 'cancelled'
-- plan_expires_at     : null = no expiry (free); set for paid plans

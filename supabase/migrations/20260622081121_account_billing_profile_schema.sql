alter table public.qr_codes add column if not exists deleted_at timestamptz;
create index if not exists idx_qr_codes_user_active
  on public.qr_codes(user_id, updated_at desc)
  where deleted_at is null;

alter table public.qr_styles add column if not exists updated_at timestamptz not null default now();

alter table public.user_settings add column if not exists current_plan text not null default 'free';
alter table public.user_settings add column if not exists billing_cycle text not null default 'monthly';
alter table public.user_settings add column if not exists subscription_status text not null default 'free';
alter table public.user_settings add column if not exists plan_expires_at timestamptz;

alter table public.user_settings drop constraint if exists user_settings_current_plan_check;
alter table public.user_settings drop constraint if exists user_settings_billing_cycle_check;
alter table public.user_settings drop constraint if exists user_settings_subscription_status_check;
alter table public.user_settings
  add constraint user_settings_current_plan_check check (current_plan in ('free', 'starter', 'pro', 'enterprise')),
  add constraint user_settings_billing_cycle_check check (billing_cycle in ('monthly', 'yearly')),
  add constraint user_settings_subscription_status_check check (subscription_status in ('free', 'active', 'trial', 'expired', 'cancelled', 'paused', 'past_due', 'unpaid'));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'lemon_squeezy',
  provider_subscription_id text not null,
  provider_customer_id text,
  provider_order_id text,
  provider_product_id text,
  provider_variant_id text,
  plan_key text not null,
  status text not null default 'active',
  billing_interval text not null default 'monthly',
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
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_subscription_id)
);

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions drop constraint if exists subscriptions_billing_interval_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('free', 'active', 'trial', 'expired', 'cancelled', 'paused', 'past_due', 'unpaid')),
  add constraint subscriptions_billing_interval_check check (billing_interval in ('monthly', 'yearly'));
create index if not exists idx_subscriptions_user_updated on public.subscriptions(user_id, updated_at desc);

create table if not exists public.billing_payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'lemon_squeezy',
  provider_invoice_id text not null,
  provider_subscription_id text not null,
  status text not null,
  amount integer,
  currency text,
  billed_at timestamptz,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_invoice_id)
);
create index if not exists idx_billing_payment_history_user_billed on public.billing_payment_history(user_id, billed_at desc);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_name text not null,
  payload_hash text not null unique,
  provider_resource_id text,
  matched_user_id uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_billing_webhook_events_created on public.billing_webhook_events(created_at desc);

alter table public.subscriptions enable row level security;
alter table public.billing_payment_history enable row level security;
alter table public.billing_webhook_events enable row level security;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.billing_payment_history from anon, authenticated;
revoke all on table public.billing_webhook_events from anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.billing_payment_history to authenticated;
grant all on table public.subscriptions to service_role;
grant all on table public.billing_payment_history to service_role;
grant all on table public.billing_webhook_events to service_role;

drop policy if exists authenticated_select_own_subscriptions on public.subscriptions;
create policy authenticated_select_own_subscriptions on public.subscriptions
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists authenticated_select_own_payment_history on public.billing_payment_history;
create policy authenticated_select_own_payment_history on public.billing_payment_history
for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_qr_style_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_qr_styles_updated_at on public.qr_styles;
create trigger trg_qr_styles_updated_at before update on public.qr_styles
for each row execute function public.touch_qr_style_updated_at();

notify pgrst, 'reload schema';

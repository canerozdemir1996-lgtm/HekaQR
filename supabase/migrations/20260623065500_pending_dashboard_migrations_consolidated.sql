-- Consolidated re-application of 4 migrations that were committed
-- (20260622081121, 20260622081630, 20260622111833, 20260622174500) but never
-- actually run against the production Supabase database. The app code already
-- expects this schema (profiles, subscriptions, billing_payment_history,
-- billing_webhook_events, qr_template_collections, booking_forms,
-- booking_slots, booking_submissions, feedback_submissions columns), which is
-- why /dashboard/profile, /dashboard/bookings and /dashboard/feedback were
-- showing "Veritabanı şeması eksik veya eski görünüyor."
--
-- Every statement below is idempotent (IF NOT EXISTS / DROP ... IF EXISTS),
-- safe to run even where some objects already exist.

-- ===== 1/4: account/billing/profile schema =====
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

-- ===== 2/4: harden account/billing schema =====
alter function public.touch_qr_style_updated_at() set search_path = pg_catalog, public;

create index if not exists idx_billing_webhook_events_matched_user
  on public.billing_webhook_events(matched_user_id);
create index if not exists idx_qr_codes_style_id
  on public.qr_codes(style_id);

drop policy if exists no_client_access_billing_webhook_events on public.billing_webhook_events;
create policy no_client_access_billing_webhook_events
on public.billing_webhook_events for all to anon, authenticated
using (false) with check (false);

alter table public.qr_styles add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.qr_styles
set user_id = (
  select qr.user_id
  from public.qr_codes qr
  where qr.style_id = public.qr_styles.id and qr.user_id is not null
  order by qr.created_at asc
  limit 1
)
where user_id is null;
create index if not exists idx_qr_styles_user_created on public.qr_styles(user_id, created_at desc);

drop policy if exists styles_read on public.qr_styles;
drop policy if exists styles_write on public.qr_styles;
drop policy if exists authenticated_manage_own_qr_styles on public.qr_styles;
create policy authenticated_manage_own_qr_styles
on public.qr_styles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ===== 3/4: qr template + profile hardening =====
alter table public.qr_codes add column if not exists qr_design jsonb;
alter table public.qr_codes alter column qr_design set default '{}'::jsonb;
update public.qr_codes qr
set qr_design = coalesce(style.config, '{}'::jsonb)
from public.qr_styles style
where qr.style_id = style.id
  and (qr.qr_design is null or qr.qr_design = '{}'::jsonb);
update public.qr_codes set qr_design = '{}'::jsonb where qr_design is null;

alter table public.qr_codes drop constraint if exists qr_codes_qr_type_check;
alter table public.qr_codes
  add constraint qr_codes_qr_type_check check (qr_type in (
    'url','product','vcard','multi','wifi','sms','email','whatsapp','text','phone',
    'menu','feedback','booking','doc','appstore','event','location','document',
    'audio','coupon'
  ));

alter table public.qr_styles add column if not exists category text not null default 'custom';
alter table public.qr_styles add column if not exists visibility text not null default 'private';
alter table public.qr_styles add column if not exists description text;
alter table public.qr_styles add column if not exists preview_url text;
alter table public.qr_styles drop constraint if exists qr_styles_visibility_check;
alter table public.qr_styles
  add constraint qr_styles_visibility_check check (visibility in ('system','public','private'));

create table if not exists public.qr_template_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.qr_styles add column if not exists collection_id uuid references public.qr_template_collections(id) on delete set null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (username is null or username ~ '^[A-Za-z0-9_-]{3,12}$')
);
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username)) where username is not null;

create table if not exists public.booking_forms (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null unique references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.booking_forms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 1 check (capacity between 1 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint booking_slots_time_check check (ends_at > starts_at)
);

create index if not exists idx_qr_styles_visibility_category on public.qr_styles(visibility, category);
create index if not exists idx_qr_styles_collection on public.qr_styles(collection_id);
create index if not exists idx_qr_template_collections_user_created on public.qr_template_collections(user_id, created_at desc);
create index if not exists idx_booking_forms_user on public.booking_forms(user_id);
create index if not exists idx_booking_slots_form_start on public.booking_slots(form_id, starts_at);

create or replace function public.touch_user_owned_resource_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_qr_template_collections_updated_at on public.qr_template_collections;
create trigger trg_qr_template_collections_updated_at before update on public.qr_template_collections
for each row execute function public.touch_user_owned_resource_updated_at();
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.touch_user_owned_resource_updated_at();
drop trigger if exists trg_booking_forms_updated_at on public.booking_forms;
create trigger trg_booking_forms_updated_at before update on public.booking_forms
for each row execute function public.touch_user_owned_resource_updated_at();

alter table public.qr_styles enable row level security;
alter table public.qr_template_collections enable row level security;
alter table public.profiles enable row level security;
alter table public.booking_forms enable row level security;
alter table public.booking_slots enable row level security;

drop policy if exists authenticated_manage_own_qr_styles on public.qr_styles;
drop policy if exists qr_styles_select_visible on public.qr_styles;
drop policy if exists qr_styles_insert_private on public.qr_styles;
drop policy if exists qr_styles_update_private on public.qr_styles;
drop policy if exists qr_styles_delete_private on public.qr_styles;
create policy qr_styles_select_visible on public.qr_styles for select to anon, authenticated
using (visibility in ('system','public') or (select auth.uid()) = user_id);
create policy qr_styles_insert_private on public.qr_styles for insert to authenticated
with check ((select auth.uid()) = user_id and visibility = 'private');
create policy qr_styles_update_private on public.qr_styles for update to authenticated
using ((select auth.uid()) = user_id and visibility = 'private')
with check ((select auth.uid()) = user_id and visibility = 'private');
create policy qr_styles_delete_private on public.qr_styles for delete to authenticated
using ((select auth.uid()) = user_id and visibility = 'private');

drop policy if exists qr_template_collections_owner_all on public.qr_template_collections;
create policy qr_template_collections_owner_all on public.qr_template_collections for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_owner_insert on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profiles_owner_update on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists booking_forms_owner_all on public.booking_forms;
create policy booking_forms_owner_all on public.booking_forms for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists booking_slots_owner_all on public.booking_slots;
create policy booking_slots_owner_all on public.booking_slots for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots from anon;
grant select, insert, update, delete on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots to authenticated;
grant all on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots to service_role;
grant select, insert, update, delete on public.qr_styles to authenticated;

create or replace view public.qr_templates with (security_invoker = true) as
select id, user_id as owner_id, name, description, category, visibility,
       config, preview_url, collection_id, created_at, updated_at
from public.qr_styles;

create or replace view public.qr_designs with (security_invoker = true) as
select id as qr_id, user_id, style_id as template_id, qr_design as config, updated_at
from public.qr_codes;

create or replace view public.qr_scans with (security_invoker = true) as
select * from public.scan_logs;

grant select on public.qr_templates, public.qr_designs, public.qr_scans to authenticated;
grant select on public.qr_templates to anon;

-- ===== 4/4: dashboard schema guard =====
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists last_login_at timestamptz;
create unique index if not exists idx_profiles_username_unique on public.profiles(lower(username)) where username is not null;

create table if not exists public.booking_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_submissions add column if not exists device_id text;
alter table public.booking_submissions add column if not exists name text;
alter table public.booking_submissions add column if not exists phone text;
alter table public.booking_submissions add column if not exists email text;
alter table public.booking_submissions add column if not exists selected_date date;
alter table public.booking_submissions add column if not exists selected_time text;
alter table public.booking_submissions add column if not exists service text;
alter table public.booking_submissions add column if not exists message text;
alter table public.booking_submissions add column if not exists service_type text;
alter table public.booking_submissions add column if not exists appointment_date date;
alter table public.booking_submissions add column if not exists appointment_time time;
alter table public.booking_submissions add column if not exists duration_minutes integer default 30;
alter table public.booking_submissions add column if not exists timezone text default 'Europe/Istanbul';
alter table public.booking_submissions add column if not exists customer_name text;
alter table public.booking_submissions add column if not exists customer_email text;
alter table public.booking_submissions add column if not exists customer_phone text;
alter table public.booking_submissions add column if not exists note text;
alter table public.booking_submissions add column if not exists location_label text;
alter table public.booking_submissions add column if not exists admin_note text;
alter table public.booking_submissions add column if not exists completed_at timestamptz;
alter table public.booking_submissions drop constraint if exists booking_submissions_status_check;
alter table public.booking_submissions
  add constraint booking_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

alter table public.feedback_submissions add column if not exists feedback_type text;
alter table public.feedback_submissions add column if not exists type text;
alter table public.feedback_submissions add column if not exists kind text;
alter table public.feedback_submissions add column if not exists priority text default 'normal';
alter table public.feedback_submissions add column if not exists subject text default 'Genel';
alter table public.feedback_submissions add column if not exists tags text[] default '{}'::text[];
alter table public.feedback_submissions add column if not exists device_id text;
alter table public.feedback_submissions add column if not exists location_id text;
alter table public.feedback_submissions add column if not exists admin_note text;
alter table public.feedback_submissions add column if not exists completed_at timestamptz;
alter table public.feedback_submissions add column if not exists contact_name text;
alter table public.feedback_submissions add column if not exists contact_email text;
alter table public.feedback_submissions add column if not exists contact_phone text;
alter table public.feedback_submissions add column if not exists location_label text;
alter table public.feedback_submissions add column if not exists location_data jsonb default '{}'::jsonb;
alter table public.feedback_submissions add column if not exists user_agent text;
alter table public.feedback_submissions add column if not exists ip_hash text;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_kind_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_type_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_feedback_type_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_priority_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_status_check;
alter table public.feedback_submissions
  add constraint feedback_submissions_kind_check check (kind is null or kind in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_type_check check (type is null or type in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_feedback_type_check check (feedback_type is null or feedback_type in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_priority_check check (priority is null or priority in ('low','normal','high','urgent')),
  add constraint feedback_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

create index if not exists idx_booking_submissions_user_date on public.booking_submissions(user_id, appointment_date, appointment_time);
create index if not exists idx_feedback_submissions_user_created on public.feedback_submissions(user_id, created_at desc);

alter table public.booking_submissions enable row level security;
alter table public.feedback_submissions enable row level security;

drop policy if exists public_insert_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_select_own_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_update_own_booking_submissions on public.booking_submissions;
create policy public_insert_booking_submissions on public.booking_submissions
for insert to anon, authenticated
with check (true);
create policy authenticated_select_own_booking_submissions on public.booking_submissions
for select to authenticated
using ((select auth.uid()) = user_id);
create policy authenticated_update_own_booking_submissions on public.booking_submissions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists public_insert_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_select_own_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_update_own_feedback_submissions on public.feedback_submissions;
create policy public_insert_feedback_submissions on public.feedback_submissions
for insert to anon, authenticated
with check (true);
create policy authenticated_select_own_feedback_submissions on public.feedback_submissions
for select to authenticated
using ((select auth.uid()) = user_id);
create policy authenticated_update_own_feedback_submissions on public.feedback_submissions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.booking_submissions from anon, authenticated;
grant insert on public.booking_submissions to anon, authenticated;
grant select, update on public.booking_submissions to authenticated;
grant all on public.booking_submissions to service_role;

revoke all on public.feedback_submissions from anon, authenticated;
grant insert on public.feedback_submissions to anon, authenticated;
grant select, update on public.feedback_submissions to authenticated;
grant all on public.feedback_submissions to service_role;

-- ===== 5/5: booking_slots index (from commit 3b2940c, depends on booking_slots existing above) =====
create index if not exists idx_booking_slots_user_id
  on public.booking_slots(user_id);

notify pgrst, 'reload schema';

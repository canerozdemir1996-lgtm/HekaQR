-- VIP license metadata for owner-assigned manual licenses.
-- current_plan = 'vip' is the visible user package type; license_plan stores
-- which entitlement package powers limits/features while the VIP key is active.

alter table public.user_settings add column if not exists license_key text;
alter table public.user_settings add column if not exists license_type text;
alter table public.user_settings add column if not exists license_plan text;
alter table public.user_settings add column if not exists license_issued_at timestamptz;
alter table public.user_settings add column if not exists license_issued_by uuid references auth.users(id) on delete set null;

alter table public.user_settings drop constraint if exists user_settings_current_plan_check;
alter table public.user_settings drop constraint if exists user_settings_license_type_check;
alter table public.user_settings drop constraint if exists user_settings_license_plan_check;

alter table public.user_settings
  add constraint user_settings_current_plan_check check (current_plan in ('free', 'starter', 'pro', 'enterprise', 'vip')),
  add constraint user_settings_license_type_check check (license_type is null or license_type in ('vip')),
  add constraint user_settings_license_plan_check check (license_plan is null or license_plan in ('starter', 'pro', 'enterprise'));

create unique index if not exists user_settings_license_key_unique
  on public.user_settings (lower(license_key))
  where license_key is not null and license_key <> '';

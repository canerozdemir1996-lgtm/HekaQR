-- Static/Dynamic QR foundation. Existing managed QR records must remain dynamic
-- so previously printed QRPublish redirect URLs and analytics keep working.

alter table public.qr_codes
  add column if not exists qr_mode text not null default 'dynamic',
  add column if not exists static_payload text,
  add column if not exists read_only_reason text;

alter table public.qr_codes
  drop constraint if exists qr_codes_qr_mode_check;

alter table public.qr_codes
  add constraint qr_codes_qr_mode_check
  check (qr_mode in ('static', 'dynamic'));

update public.qr_codes
set qr_mode = 'dynamic'
where qr_mode is null;

create index if not exists idx_qr_codes_user_dynamic_active
  on public.qr_codes (user_id, created_at)
  where qr_mode = 'dynamic' and is_active = true and deleted_at is null;

-- Enterprise and internal overrides are data, not role checks. Application code
-- reads the JSON payload only through the entitlement service.
create table if not exists public.plan_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  internal_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_entitlement_overrides_user_active
  on public.plan_entitlement_overrides (user_id, expires_at desc);

-- Do not make short_slug nullable in this migration. Static creation code must
-- be deployed together with a separate ownership/slug migration after a staging
-- verification, because existing routes currently assume short_slug is present.

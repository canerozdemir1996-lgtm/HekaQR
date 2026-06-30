create table if not exists public.coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null unique references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  discount text not null,
  description text,
  valid_until timestamptz,
  single_use boolean not null default true,
  total_limit integer,
  per_user_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  code text not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'void')),
  order_ref text,
  channel text,
  used_at timestamptz,
  used_by_hash text,
  created_at timestamptz not null default now(),
  unique (campaign_id, code)
);

create table if not exists public.coupon_redemption_attempts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.coupon_campaigns(id) on delete cascade,
  coupon_code_id uuid references public.coupon_codes(id) on delete set null,
  code text not null,
  status text not null,
  order_ref text,
  channel text,
  redeemer_hash text,
  created_at timestamptz not null default now()
);

create index if not exists coupon_campaigns_user_id_idx on public.coupon_campaigns(user_id);
create index if not exists coupon_codes_campaign_status_idx on public.coupon_codes(campaign_id, status);
create index if not exists coupon_attempts_campaign_created_idx on public.coupon_redemption_attempts(campaign_id, created_at desc);

alter table public.coupon_campaigns enable row level security;
alter table public.coupon_codes enable row level security;
alter table public.coupon_redemption_attempts enable row level security;

drop policy if exists coupon_campaigns_owner_select on public.coupon_campaigns;
create policy coupon_campaigns_owner_select
  on public.coupon_campaigns for select to authenticated
  using (user_id = auth.uid());

drop policy if exists coupon_codes_owner_select on public.coupon_codes;
create policy coupon_codes_owner_select
  on public.coupon_codes for select to authenticated
  using (
    exists (
      select 1 from public.coupon_campaigns c
      where c.id = coupon_codes.campaign_id and c.user_id = auth.uid()
    )
  );

drop policy if exists coupon_attempts_owner_select on public.coupon_redemption_attempts;
create policy coupon_attempts_owner_select
  on public.coupon_redemption_attempts for select to authenticated
  using (
    exists (
      select 1 from public.coupon_campaigns c
      where c.id = coupon_redemption_attempts.campaign_id and c.user_id = auth.uid()
    )
  );

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

create or replace function public.redeem_coupon_code(
  p_slug text,
  p_code text,
  p_order_ref text default null,
  p_channel text default 'web',
  p_redeemer_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign coupon_campaigns%rowtype;
  v_code coupon_codes%rowtype;
  v_normalized_code text := upper(trim(p_code));
  v_status text;
begin
  select c.*
    into v_campaign
  from public.coupon_campaigns c
  join public.qr_codes q on q.id = c.qr_id
  where q.short_slug = lower(trim(p_slug))
    and q.is_active = true
    and q.deleted_at is null
  limit 1;

  if not found then
    insert into public.coupon_redemption_attempts(code, status, order_ref, channel, redeemer_hash)
    values (v_normalized_code, 'campaign_not_found', p_order_ref, p_channel, p_redeemer_hash);
    return jsonb_build_object('ok', false, 'status', 'campaign_not_found', 'message', 'Kupon kampanyası bulunamadı.');
  end if;

  if v_campaign.valid_until is not null and v_campaign.valid_until < now() then
    insert into public.coupon_redemption_attempts(campaign_id, code, status, order_ref, channel, redeemer_hash)
    values (v_campaign.id, v_normalized_code, 'expired', p_order_ref, p_channel, p_redeemer_hash);
    return jsonb_build_object('ok', false, 'status', 'expired', 'message', 'Bu kuponun süresi dolmuş.');
  end if;

  update public.coupon_codes
     set status = 'used',
         used_at = now(),
         order_ref = coalesce(nullif(p_order_ref, ''), order_ref),
         channel = coalesce(nullif(p_channel, ''), channel),
         used_by_hash = coalesce(p_redeemer_hash, used_by_hash)
   where campaign_id = v_campaign.id
     and upper(code) = v_normalized_code
     and status = 'active'
   returning * into v_code;

  if found then
    insert into public.coupon_redemption_attempts(campaign_id, coupon_code_id, code, status, order_ref, channel, redeemer_hash)
    values (v_campaign.id, v_code.id, v_normalized_code, 'used', p_order_ref, p_channel, p_redeemer_hash);
    return jsonb_build_object(
      'ok', true,
      'status', 'used',
      'message', 'Kupon doğrulandı.',
      'discount', v_campaign.discount,
      'description', v_campaign.description,
      'used_at', v_code.used_at
    );
  end if;

  select *
    into v_code
  from public.coupon_codes
  where campaign_id = v_campaign.id
    and upper(code) = v_normalized_code
  limit 1;

  v_status := case
    when not found then 'invalid'
    when v_code.status = 'used' then 'already_used'
    else v_code.status
  end;

  insert into public.coupon_redemption_attempts(campaign_id, coupon_code_id, code, status, order_ref, channel, redeemer_hash)
  values (v_campaign.id, case when found then v_code.id else null end, v_normalized_code, v_status, p_order_ref, p_channel, p_redeemer_hash);

  return jsonb_build_object(
    'ok', false,
    'status', v_status,
    'message', case
      when v_status = 'already_used' then 'Bu kod daha önce kullanılmış.'
      when v_status = 'invalid' then 'Kod geçersiz.'
      when v_status = 'void' then 'Bu kod iptal edilmiş.'
      else 'Kod kullanılamıyor.'
    end
  );
end;
$$;

grant execute on function public.redeem_coupon_code(text, text, text, text, text) to anon, authenticated;

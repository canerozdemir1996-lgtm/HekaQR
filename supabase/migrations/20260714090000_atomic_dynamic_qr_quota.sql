-- Database-side source used by the quota trigger. Application-facing labels
-- and richer feature grants remain in lib/plan-limits.ts; this narrow mirror
-- exists so concurrent inserts cannot bypass the dynamic QR allowance.
create table if not exists public.plan_entitlements (
  plan_key text primary key,
  active_dynamic_qr_limit integer,
  updated_at timestamptz not null default now(),
  check (active_dynamic_qr_limit is null or active_dynamic_qr_limit >= 0)
);

insert into public.plan_entitlements (plan_key, active_dynamic_qr_limit) values
  ('free', 3),
  ('starter', 25),
  ('pro', 200),
  ('enterprise', null),
  ('vip', null)
on conflict (plan_key) do update
set active_dynamic_qr_limit = excluded.active_dynamic_qr_limit,
    updated_at = now();

create or replace function public.enforce_dynamic_qr_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_override integer;
  v_count integer;
begin
  if new.qr_mode <> 'dynamic' or coalesce(new.is_active, true) = false then
    return new;
  end if;

  -- One transaction at a time per owner: protects direct API, bulk, and
  -- service-role inserts without trusting client usage counters.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select coalesce(current_plan, 'free'),
         nullif(enterprise_limits->>'dynamicQr', '')::integer
    into v_plan, v_override
    from public.user_settings
   where user_id = new.user_id;

  select active_dynamic_qr_limit into v_limit
    from public.plan_entitlements
   where plan_key = coalesce(v_plan, 'free');

  if v_plan = 'enterprise' and v_override is not null then
    v_limit := v_override;
  end if;
  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count
    from public.qr_codes
   where user_id = new.user_id
     and qr_mode = 'dynamic'
     and coalesce(is_active, true) = true
     and deleted_at is null
     and (tg_op = 'INSERT' or id <> new.id);

  if v_count >= v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'DYNAMIC_QR_LIMIT_REACHED',
      detail = format('limit=%s used=%s', v_limit, v_count);
  end if;

  return new;
end;
$$;

drop trigger if exists qr_codes_dynamic_quota_guard on public.qr_codes;
create trigger qr_codes_dynamic_quota_guard
before insert or update of qr_mode, is_active on public.qr_codes
for each row execute function public.enforce_dynamic_qr_quota();

revoke all on public.plan_entitlements from public;
grant select on public.plan_entitlements to service_role;

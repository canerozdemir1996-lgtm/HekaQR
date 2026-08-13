-- Shared atomic counters for metered plan features. Call from authenticated
-- server routes only; PostgreSQL serializes concurrent reservations per key.
create table if not exists public.plan_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  usage_key text not null check (usage_key in ('bulk_qr_created', 'api_request')),
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period, usage_key)
);

create or replace function public.consume_monthly_plan_usage(
  p_user_id uuid,
  p_period text,
  p_usage_key text,
  p_limit integer,
  p_amount integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_used integer;
begin
  if p_limit is null then return true; end if;
  if p_limit < 0 or p_amount <= 0 then return false; end if;

  insert into public.plan_usage_counters (user_id, period, usage_key, used)
  values (p_user_id, p_period, p_usage_key, 0)
  on conflict (user_id, period, usage_key) do nothing;

  update public.plan_usage_counters
     set used = used + p_amount, updated_at = now()
   where user_id = p_user_id
     and period = p_period
     and usage_key = p_usage_key
     and used + p_amount <= p_limit
  returning used into v_used;

  return found;
end;
$$;

-- Keep existing QRs reachable after a downgrade, but make excess dynamic QR
-- rows read-only in stable creation order. Billing/webhook code calls this
-- function immediately after a plan change; it is safe to call repeatedly.
create or replace function public.refresh_qr_read_only_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_override integer;
begin
  select coalesce(current_plan, 'free'), nullif(enterprise_limits->>'dynamicQr', '')::integer
    into v_plan, v_override
    from public.user_settings where user_id = p_user_id;
  select active_dynamic_qr_limit into v_limit from public.plan_entitlements where plan_key = coalesce(v_plan, 'free');
  if v_plan = 'enterprise' and v_override is not null then v_limit := v_override; end if;

  if v_limit is null then
    update public.qr_codes set read_only_reason = null where user_id = p_user_id and read_only_reason = 'PLAN_LIMIT_EXCEEDED';
    return;
  end if;

  with ranked as (
    select id, row_number() over (order by created_at asc, id asc) as row_no
      from public.qr_codes
     where user_id = p_user_id and qr_mode = 'dynamic' and coalesce(is_active, true) and deleted_at is null
  )
  update public.qr_codes q
     set read_only_reason = case when ranked.row_no > v_limit then 'PLAN_LIMIT_EXCEEDED' else null end
    from ranked
   where q.id = ranked.id;
end;
$$;

-- Periodic retention worker. Free remains 30 days; paid tiers retain based on
-- plan_entitlements once those fields are populated by the entitlement sync.
alter table public.plan_entitlements add column if not exists scan_log_retention_days integer;
update public.plan_entitlements set scan_log_retention_days = case plan_key
  when 'free' then 30 when 'starter' then 180 when 'pro' then 730 else null end;

create or replace function public.cleanup_scan_logs_by_plan_retention()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.scan_logs sl
   using public.qr_codes q
   join public.user_settings us on us.user_id = q.user_id
   join public.plan_entitlements pe on pe.plan_key = coalesce(us.current_plan, 'free')
  where sl.qr_id = q.id
    and pe.scan_log_retention_days is not null
    and sl.created_at < now() - make_interval(days => pe.scan_log_retention_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on public.plan_usage_counters from public;
revoke all on function public.consume_monthly_plan_usage(uuid, text, text, integer, integer) from public;
revoke all on function public.refresh_qr_read_only_for_user(uuid) from public;
grant execute on function public.consume_monthly_plan_usage(uuid, text, text, integer, integer) to service_role;
grant execute on function public.refresh_qr_read_only_for_user(uuid) to service_role;

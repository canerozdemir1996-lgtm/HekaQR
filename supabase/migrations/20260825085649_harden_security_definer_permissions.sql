-- SECURITY DEFINER functions receive EXECUTE from PUBLIC by default in
-- PostgreSQL. Keep maintenance and quota helpers callable only by the trusted
-- backend role, and keep entitlement internals out of the Data API.

-- Fail before changing any privileges when the canonical schema is incomplete
-- or has drifted away from the expected SECURITY DEFINER contract.
do $$
declare
  required_signature text;
  required_function regprocedure;
begin
  if to_regclass('public.plan_entitlements') is null then
    raise exception 'release preflight failed: missing table public.plan_entitlements';
  end if;
  if to_regclass('public.plan_usage_counters') is null then
    raise exception 'release preflight failed: missing table public.plan_usage_counters';
  end if;
  if to_regclass('public.plan_entitlement_overrides') is null then
    raise exception 'release preflight failed: missing table public.plan_entitlement_overrides';
  end if;

  foreach required_signature in array array[
    'public.cleanup_scan_logs_by_plan_retention()',
    'public.consume_monthly_plan_usage(uuid,text,text,integer,integer)',
    'public.refresh_qr_read_only_for_user(uuid)',
    'public.enforce_dynamic_qr_quota()',
    'public.sync_qr_scan_count()'
  ]
  loop
    required_function := to_regprocedure(required_signature);
    if required_function is null then
      raise exception 'release preflight failed: missing function %', required_signature;
    end if;
    if not (select prosecdef from pg_catalog.pg_proc where oid = required_function) then
      raise exception 'release preflight failed: function % is not SECURITY DEFINER', required_function;
    end if;
  end loop;
end;
$$;

-- An empty explicit search_path prevents caller-controlled object resolution.
-- Every application relation referenced by these functions is schema-qualified.
alter function public.cleanup_scan_logs_by_plan_retention() set search_path = '';
alter function public.consume_monthly_plan_usage(uuid, text, text, integer, integer) set search_path = '';
alter function public.refresh_qr_read_only_for_user(uuid) set search_path = '';
alter function public.enforce_dynamic_qr_quota() set search_path = '';
alter function public.sync_qr_scan_count() set search_path = '';

revoke all on function public.cleanup_scan_logs_by_plan_retention() from public, anon, authenticated;
grant execute on function public.cleanup_scan_logs_by_plan_retention() to service_role;

-- These legacy helpers came from the pre-Supabase-CLI migrations directory.
-- Production may have them even though a fresh CLI reset does not, so harden
-- them conditionally without making clean-environment migration fail.
do $$
begin
  if to_regprocedure('public.increment_monthly_scan_count(uuid,text,integer)') is not null then
    execute 'revoke all on function public.increment_monthly_scan_count(uuid, text, integer) from public, anon, authenticated';
    execute 'grant execute on function public.increment_monthly_scan_count(uuid, text, integer) to service_role';
    execute 'alter function public.increment_monthly_scan_count(uuid, text, integer) set search_path = ''''';
  end if;
  if to_regprocedure('public.cleanup_free_plan_scan_logs()') is not null then
    execute 'revoke all on function public.cleanup_free_plan_scan_logs() from public, anon, authenticated';
    execute 'grant execute on function public.cleanup_free_plan_scan_logs() to service_role';
    execute 'alter function public.cleanup_free_plan_scan_logs() set search_path = ''''';
  end if;
end;
$$;

revoke all on function public.consume_monthly_plan_usage(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.refresh_qr_read_only_for_user(uuid) from public, anon, authenticated;
grant execute on function public.consume_monthly_plan_usage(uuid, text, text, integer, integer) to service_role;
grant execute on function public.refresh_qr_read_only_for_user(uuid) to service_role;

-- Trigger functions are not application RPCs. Explicit revocation prevents
-- accidental exposure if PostgREST introspection or function signatures change.
revoke all on function public.enforce_dynamic_qr_quota() from public, anon, authenticated;
revoke all on function public.sync_qr_scan_count() from public, anon, authenticated;

alter table public.plan_entitlements enable row level security;
alter table public.plan_usage_counters enable row level security;
alter table public.plan_entitlement_overrides enable row level security;

revoke all on table public.plan_entitlements from public, anon, authenticated;
revoke all on table public.plan_usage_counters from public, anon, authenticated;
revoke all on table public.plan_entitlement_overrides from public, anon, authenticated;

grant select on table public.plan_entitlements to service_role;
grant all on table public.plan_usage_counters to service_role;
grant all on table public.plan_entitlement_overrides to service_role;

notify pgrst, 'reload schema';

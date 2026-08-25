-- SECURITY DEFINER functions receive EXECUTE from PUBLIC by default in
-- PostgreSQL. Keep maintenance and quota helpers callable only by the trusted
-- backend role, and keep entitlement internals out of the Data API.

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
  end if;
  if to_regprocedure('public.cleanup_free_plan_scan_logs()') is not null then
    execute 'revoke all on function public.cleanup_free_plan_scan_logs() from public, anon, authenticated';
    execute 'grant execute on function public.cleanup_free_plan_scan_logs() to service_role';
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

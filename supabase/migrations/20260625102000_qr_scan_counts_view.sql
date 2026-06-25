create or replace view public.qr_scan_counts
with (security_invoker = true)
as
select
  qr_id,
  count(*)::integer as scan_count
from public.scan_logs
group by qr_id;

grant select on public.qr_scan_counts to service_role;

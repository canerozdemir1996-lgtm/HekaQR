create or replace function public.sync_qr_scan_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.qr_codes
    set scan_count = coalesce(scan_count, 0) + 1
    where id = new.qr_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.qr_codes
    set scan_count = greatest(coalesce(scan_count, 0) - 1, 0)
    where id = old.qr_id;
    return old;
  end if;

  if old.qr_id is distinct from new.qr_id then
    update public.qr_codes
    set scan_count = greatest(coalesce(scan_count, 0) - 1, 0)
    where id = old.qr_id;

    update public.qr_codes
    set scan_count = coalesce(scan_count, 0) + 1
    where id = new.qr_id;
  end if;

  return new;
end;
$$;

drop trigger if exists scan_logs_sync_qr_count on public.scan_logs;

create trigger scan_logs_sync_qr_count
after insert or delete or update of qr_id on public.scan_logs
for each row execute function public.sync_qr_scan_count();

revoke execute on function public.sync_qr_scan_count() from public;
grant execute on function public.sync_qr_scan_count() to service_role;

update public.qr_codes q
set scan_count = counts.total
from (
  select qr_id, count(*)::integer as total
  from public.scan_logs
  group by qr_id
) counts
where counts.qr_id = q.id;

update public.qr_codes q
set scan_count = 0
where not exists (
  select 1
  from public.scan_logs s
  where s.qr_id = q.id
);

create index if not exists scan_logs_qr_scanned_at_idx
  on public.scan_logs (qr_id, scanned_at desc);

create index if not exists scan_logs_qr_fingerprint_idx
  on public.scan_logs (qr_id, fingerprint)
  where fingerprint is not null;

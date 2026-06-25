with counts as (
  select q.id, count(s.id)::integer as total
  from public.qr_codes q
  left join public.scan_logs s on s.qr_id = q.id
  group by q.id
)
update public.qr_codes q
set scan_count = counts.total
from counts
where q.id = counts.id
  and coalesce(q.scan_count, 0) <> counts.total;

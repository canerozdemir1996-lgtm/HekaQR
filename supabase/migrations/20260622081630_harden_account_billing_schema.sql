alter function public.touch_qr_style_updated_at() set search_path = pg_catalog, public;

create index if not exists idx_billing_webhook_events_matched_user
  on public.billing_webhook_events(matched_user_id);
create index if not exists idx_qr_codes_style_id
  on public.qr_codes(style_id);

drop policy if exists no_client_access_billing_webhook_events on public.billing_webhook_events;
create policy no_client_access_billing_webhook_events
on public.billing_webhook_events for all to anon, authenticated
using (false) with check (false);

alter table public.qr_styles add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.qr_styles
set user_id = (
  select qr.user_id
  from public.qr_codes qr
  where qr.style_id = public.qr_styles.id and qr.user_id is not null
  order by qr.created_at asc
  limit 1
)
where user_id is null;
create index if not exists idx_qr_styles_user_created on public.qr_styles(user_id, created_at desc);

drop policy if exists styles_read on public.qr_styles;
drop policy if exists styles_write on public.qr_styles;
drop policy if exists authenticated_manage_own_qr_styles on public.qr_styles;
create policy authenticated_manage_own_qr_styles
on public.qr_styles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

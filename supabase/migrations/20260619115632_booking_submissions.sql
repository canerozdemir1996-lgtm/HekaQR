create table if not exists public.booking_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'new',
  service_type text,
  appointment_date date not null,
  appointment_time time not null,
  duration_minutes integer not null default 30,
  timezone text not null default 'Europe/Istanbul',
  capacity_snapshot integer,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  note text,
  location_label text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_submissions drop constraint if exists booking_submissions_status_check;
alter table public.booking_submissions
  add constraint booking_submissions_status_check check (status in ('new','approved','completed','cancelled'));

create index if not exists idx_booking_submissions_user_date on public.booking_submissions(user_id, appointment_date, appointment_time);
create index if not exists idx_booking_submissions_qr_date on public.booking_submissions(qr_id, appointment_date, appointment_time);
create index if not exists idx_booking_submissions_status on public.booking_submissions(status);

create or replace function public.set_booking_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_booking_submissions_updated_at on public.booking_submissions;
create trigger trg_booking_submissions_updated_at
before update on public.booking_submissions
for each row
execute function public.set_booking_submissions_updated_at();

create schema if not exists private;

create or replace function private.can_submit_booking(target_qr_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.qr_codes q
    where q.id = target_qr_id
      and q.user_id = target_user_id
      and q.is_active = true
      and coalesce(q.dynamic_content->>'kind', '') = 'booking'
  );
$$;

revoke all on function private.can_submit_booking(uuid, uuid) from public;
grant execute on function private.can_submit_booking(uuid, uuid) to anon, authenticated, service_role;

alter table public.booking_submissions enable row level security;

revoke all on table public.booking_submissions from anon, authenticated;
grant insert on table public.booking_submissions to anon;
grant select, update on table public.booking_submissions to authenticated;
grant all on table public.booking_submissions to service_role;

drop policy if exists public_insert_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_select_own_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_update_own_booking_submissions on public.booking_submissions;

create policy public_insert_booking_submissions
on public.booking_submissions
for insert
to anon
with check (private.can_submit_booking(qr_id, user_id));

create policy authenticated_select_own_booking_submissions
on public.booking_submissions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy authenticated_update_own_booking_submissions
on public.booking_submissions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

create table if not exists public.booking_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid references public.qr_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  name text,
  phone text,
  email text,
  selected_date date,
  selected_time text,
  service text,
  message text,
  status text default 'new',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.booking_submissions add column if not exists device_id text;
alter table public.booking_submissions add column if not exists name text;
alter table public.booking_submissions add column if not exists phone text;
alter table public.booking_submissions add column if not exists email text;
alter table public.booking_submissions add column if not exists selected_date date;
alter table public.booking_submissions add column if not exists selected_time text;
alter table public.booking_submissions add column if not exists service text;
alter table public.booking_submissions add column if not exists message text;
alter table public.booking_submissions add column if not exists completed_at timestamptz;

alter table public.booking_submissions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.booking_submissions add column if not exists service_type text;
alter table public.booking_submissions add column if not exists appointment_date date;
alter table public.booking_submissions add column if not exists appointment_time time;
alter table public.booking_submissions add column if not exists duration_minutes integer default 30;
alter table public.booking_submissions add column if not exists timezone text default 'Europe/Istanbul';
alter table public.booking_submissions add column if not exists capacity_snapshot integer;
alter table public.booking_submissions add column if not exists customer_name text;
alter table public.booking_submissions add column if not exists customer_email text;
alter table public.booking_submissions add column if not exists customer_phone text;
alter table public.booking_submissions add column if not exists note text;
alter table public.booking_submissions add column if not exists location_label text;

update public.booking_submissions
set status = 'in_progress'
where status = 'approved';

update public.booking_submissions
set
  selected_date = coalesce(selected_date, appointment_date),
  selected_time = coalesce(selected_time, appointment_time::text),
  name = coalesce(nullif(name, ''), nullif(customer_name, '')),
  email = coalesce(nullif(email, ''), nullif(customer_email, '')),
  phone = coalesce(nullif(phone, ''), nullif(customer_phone, '')),
  service = coalesce(nullif(service, ''), nullif(service_type, '')),
  message = coalesce(nullif(message, ''), nullif(note, ''))
where
  selected_date is null
  or selected_time is null
  or name is null
  or email is null
  or phone is null
  or service is null
  or message is null;

alter table public.booking_submissions alter column status set default 'new';
alter table public.booking_submissions drop constraint if exists booking_submissions_status_check;
alter table public.booking_submissions
  add constraint booking_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

create index if not exists idx_booking_submissions_user_created on public.booking_submissions(user_id, created_at desc);
create index if not exists idx_booking_submissions_selected_date on public.booking_submissions(user_id, selected_date, selected_time);
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

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid references public.qr_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  feedback_type text,
  subject text default 'Genel',
  message text,
  tags text[] default '{}'::text[],
  status text default 'new',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.feedback_submissions add column if not exists feedback_type text;
alter table public.feedback_submissions add column if not exists type text;
alter table public.feedback_submissions add column if not exists kind text;
alter table public.feedback_submissions add column if not exists priority text default 'normal';
alter table public.feedback_submissions add column if not exists subject text default 'Genel';
alter table public.feedback_submissions add column if not exists tags text[] default '{}'::text[];
alter table public.feedback_submissions add column if not exists device_id text;
alter table public.feedback_submissions add column if not exists location_id text;
alter table public.feedback_submissions add column if not exists admin_note text;
alter table public.feedback_submissions add column if not exists completed_at timestamptz;
alter table public.feedback_submissions add column if not exists contact_name text;
alter table public.feedback_submissions add column if not exists contact_email text;
alter table public.feedback_submissions add column if not exists contact_phone text;
alter table public.feedback_submissions add column if not exists location_label text;
alter table public.feedback_submissions add column if not exists location_data jsonb default '{}'::jsonb;
alter table public.feedback_submissions add column if not exists user_agent text;
alter table public.feedback_submissions add column if not exists ip_hash text;

update public.feedback_submissions
set
  feedback_type = coalesce(nullif(feedback_type, ''), nullif(type, ''), nullif(kind, ''), 'suggestion'),
  type = coalesce(nullif(type, ''), nullif(feedback_type, ''), nullif(kind, ''), 'suggestion'),
  kind = coalesce(nullif(kind, ''), nullif(feedback_type, ''), nullif(type, ''), 'suggestion'),
  subject = coalesce(nullif(subject, ''), 'Genel'),
  tags = coalesce(tags, '{}'::text[])
where
  feedback_type is null
  or type is null
  or kind is null
  or subject is null
  or tags is null;

alter table public.feedback_submissions alter column status set default 'new';
alter table public.feedback_submissions alter column tags set default '{}'::text[];
alter table public.feedback_submissions drop constraint if exists feedback_submissions_kind_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_type_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_feedback_type_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_priority_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_status_check;
alter table public.feedback_submissions
  add constraint feedback_submissions_kind_check check (kind is null or kind in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_type_check check (type is null or type in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_feedback_type_check check (feedback_type is null or feedback_type in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_priority_check check (priority is null or priority in ('low','normal','high','urgent')),
  add constraint feedback_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

create index if not exists idx_feedback_submissions_user_created on public.feedback_submissions(user_id, created_at desc);
create index if not exists idx_feedback_submissions_qr_created on public.feedback_submissions(qr_id, created_at desc);
create index if not exists idx_feedback_submissions_status on public.feedback_submissions(status);
create index if not exists idx_feedback_submissions_feedback_type on public.feedback_submissions(feedback_type);
create index if not exists idx_feedback_submissions_tags on public.feedback_submissions using gin(tags);

create or replace function public.set_feedback_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feedback_submissions_updated_at on public.feedback_submissions;
create trigger trg_feedback_submissions_updated_at
before update on public.feedback_submissions
for each row
execute function public.set_feedback_submissions_updated_at();

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

create or replace function private.can_submit_feedback_submission(target_qr_id uuid, target_user_id uuid)
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
      and (q.qr_type = 'feedback' or coalesce(q.dynamic_content->>'kind', '') = 'feedback')
  );
$$;

revoke all on function private.can_submit_booking(uuid, uuid) from public;
revoke all on function private.can_submit_feedback_submission(uuid, uuid) from public;
grant execute on function private.can_submit_booking(uuid, uuid) to anon, authenticated, service_role;
grant execute on function private.can_submit_feedback_submission(uuid, uuid) to anon, authenticated, service_role;

alter table public.booking_submissions enable row level security;
alter table public.feedback_submissions enable row level security;

revoke all on table public.booking_submissions from anon, authenticated;
revoke all on table public.feedback_submissions from anon, authenticated;
grant insert on table public.booking_submissions to anon;
grant insert on table public.feedback_submissions to anon;
grant select, update on table public.booking_submissions to authenticated;
grant select, update on table public.feedback_submissions to authenticated;
grant all on table public.booking_submissions to service_role;
grant all on table public.feedback_submissions to service_role;

drop policy if exists public_insert_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_select_own_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_update_own_booking_submissions on public.booking_submissions;
drop policy if exists public_insert_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_select_own_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_update_own_feedback_submissions on public.feedback_submissions;

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

create policy public_insert_feedback_submissions
on public.feedback_submissions
for insert
to anon
with check (private.can_submit_feedback_submission(qr_id, user_id));

create policy authenticated_select_own_feedback_submissions
on public.feedback_submissions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy authenticated_update_own_feedback_submissions
on public.feedback_submissions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

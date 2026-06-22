create extension if not exists pgcrypto;

create table if not exists public.qr_template_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.qr_styles add column if not exists visibility text not null default 'private';
alter table public.qr_styles add column if not exists collection_id uuid references public.qr_template_collections(id) on delete set null;
alter table public.qr_styles drop constraint if exists qr_styles_visibility_check;
alter table public.qr_styles
  add constraint qr_styles_visibility_check check (visibility in ('system','public','private'));

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists last_login_at timestamptz;
create unique index if not exists idx_profiles_username_unique on public.profiles(lower(username)) where username is not null;

create table if not exists public.booking_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_submissions add column if not exists device_id text;
alter table public.booking_submissions add column if not exists name text;
alter table public.booking_submissions add column if not exists phone text;
alter table public.booking_submissions add column if not exists email text;
alter table public.booking_submissions add column if not exists selected_date date;
alter table public.booking_submissions add column if not exists selected_time text;
alter table public.booking_submissions add column if not exists service text;
alter table public.booking_submissions add column if not exists message text;
alter table public.booking_submissions add column if not exists service_type text;
alter table public.booking_submissions add column if not exists appointment_date date;
alter table public.booking_submissions add column if not exists appointment_time time;
alter table public.booking_submissions add column if not exists duration_minutes integer default 30;
alter table public.booking_submissions add column if not exists timezone text default 'Europe/Istanbul';
alter table public.booking_submissions add column if not exists customer_name text;
alter table public.booking_submissions add column if not exists customer_email text;
alter table public.booking_submissions add column if not exists customer_phone text;
alter table public.booking_submissions add column if not exists note text;
alter table public.booking_submissions add column if not exists location_label text;
alter table public.booking_submissions add column if not exists admin_note text;
alter table public.booking_submissions add column if not exists completed_at timestamptz;
alter table public.booking_submissions drop constraint if exists booking_submissions_status_check;
alter table public.booking_submissions
  add constraint booking_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'new',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create index if not exists idx_qr_template_collections_user_created on public.qr_template_collections(user_id, created_at desc);
create index if not exists idx_qr_styles_visibility_category on public.qr_styles(visibility, category);
create index if not exists idx_booking_submissions_user_date on public.booking_submissions(user_id, appointment_date, appointment_time);
create index if not exists idx_feedback_submissions_user_created on public.feedback_submissions(user_id, created_at desc);

alter table public.qr_template_collections enable row level security;
alter table public.booking_submissions enable row level security;
alter table public.feedback_submissions enable row level security;

drop policy if exists qr_template_collections_owner_all on public.qr_template_collections;
create policy qr_template_collections_owner_all on public.qr_template_collections
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists public_insert_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_select_own_booking_submissions on public.booking_submissions;
drop policy if exists authenticated_update_own_booking_submissions on public.booking_submissions;
create policy public_insert_booking_submissions on public.booking_submissions
for insert to anon, authenticated
with check (true);
create policy authenticated_select_own_booking_submissions on public.booking_submissions
for select to authenticated
using ((select auth.uid()) = user_id);
create policy authenticated_update_own_booking_submissions on public.booking_submissions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists public_insert_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_select_own_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_update_own_feedback_submissions on public.feedback_submissions;
create policy public_insert_feedback_submissions on public.feedback_submissions
for insert to anon, authenticated
with check (true);
create policy authenticated_select_own_feedback_submissions on public.feedback_submissions
for select to authenticated
using ((select auth.uid()) = user_id);
create policy authenticated_update_own_feedback_submissions on public.feedback_submissions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.qr_template_collections from anon;
grant select, insert, update, delete on public.qr_template_collections to authenticated;
grant all on public.qr_template_collections to service_role;

revoke all on public.booking_submissions from anon, authenticated;
grant insert on public.booking_submissions to anon, authenticated;
grant select, update on public.booking_submissions to authenticated;
grant all on public.booking_submissions to service_role;

revoke all on public.feedback_submissions from anon, authenticated;
grant insert on public.feedback_submissions to anon, authenticated;
grant select, update on public.feedback_submissions to authenticated;
grant all on public.feedback_submissions to service_role;

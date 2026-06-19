create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'suggestion',
  kind text not null default 'suggestion',
  priority text not null default 'normal',
  status text not null default 'new',
  subject text not null default 'Genel',
  message text not null,
  tags text[] not null default '{}'::text[],
  device_id text,
  location_id text,
  admin_note text,
  completed_at timestamptz,
  contact_name text,
  contact_email text,
  contact_phone text,
  location_label text,
  location_data jsonb default '{}'::jsonb,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_submissions add column if not exists type text;
alter table public.feedback_submissions add column if not exists subject text;
alter table public.feedback_submissions add column if not exists tags text[] not null default '{}'::text[];
alter table public.feedback_submissions add column if not exists device_id text;
alter table public.feedback_submissions add column if not exists location_id text;
alter table public.feedback_submissions add column if not exists admin_note text;
alter table public.feedback_submissions add column if not exists completed_at timestamptz;

update public.feedback_submissions
set type = coalesce(nullif(type, ''), nullif(kind, ''), 'suggestion')
where type is null or type = '';

update public.feedback_submissions
set subject = coalesce(nullif(subject, ''), 'Genel')
where subject is null or subject = '';

update public.feedback_submissions
set status = case status
  when 'reviewing' then 'in_progress'
  when 'resolved' then 'completed'
  when 'closed' then 'completed'
  else status
end
where status in ('reviewing', 'resolved', 'closed');

update public.feedback_submissions
set kind = coalesce(nullif(kind, ''), nullif(type, ''), 'suggestion')
where kind is null or kind = '';

alter table public.feedback_submissions alter column type set default 'suggestion';
alter table public.feedback_submissions alter column type set not null;
alter table public.feedback_submissions alter column kind set default 'suggestion';
alter table public.feedback_submissions alter column kind set not null;
alter table public.feedback_submissions alter column subject set default 'Genel';
alter table public.feedback_submissions alter column subject set not null;
alter table public.feedback_submissions alter column tags set default '{}'::text[];
alter table public.feedback_submissions alter column tags set not null;

alter table public.feedback_submissions drop constraint if exists feedback_submissions_kind_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_type_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_priority_check;
alter table public.feedback_submissions drop constraint if exists feedback_submissions_status_check;

alter table public.feedback_submissions
  add constraint feedback_submissions_kind_check check (kind in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_type_check check (type in ('complaint','suggestion','request','thanks')),
  add constraint feedback_submissions_priority_check check (priority in ('low','normal','high','urgent')),
  add constraint feedback_submissions_status_check check (status in ('new','in_progress','completed','cancelled'));

create index if not exists idx_feedback_submissions_user_created on public.feedback_submissions(user_id, created_at desc);
create index if not exists idx_feedback_submissions_qr_created on public.feedback_submissions(qr_id, created_at desc);
create index if not exists idx_feedback_submissions_status on public.feedback_submissions(status);
create index if not exists idx_feedback_submissions_type on public.feedback_submissions(type);
create index if not exists idx_feedback_submissions_subject on public.feedback_submissions(subject);
create index if not exists idx_feedback_submissions_device_id on public.feedback_submissions(device_id);
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

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;
grant insert on table public.feedback_submissions to anon;
grant select, insert, update on table public.feedback_submissions to authenticated;
grant all on table public.feedback_submissions to service_role;

drop policy if exists "public insert feedback submissions" on public.feedback_submissions;
drop policy if exists "authenticated select own feedback submissions" on public.feedback_submissions;
drop policy if exists "authenticated update own feedback submissions" on public.feedback_submissions;
drop policy if exists public_insert_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_select_own_feedback_submissions on public.feedback_submissions;
drop policy if exists authenticated_update_own_feedback_submissions on public.feedback_submissions;

create policy public_insert_feedback_submissions
on public.feedback_submissions
for insert
to anon
with check (
  exists (
    select 1
    from public.qr_codes q
    where q.id = qr_id
      and q.user_id = user_id
      and q.is_active = true
      and (q.qr_type = 'feedback' or coalesce(q.dynamic_content->>'kind', '') = 'feedback')
  )
);

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

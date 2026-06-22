-- Canonical QR design model: qr_styles stores reusable templates while
-- qr_codes.qr_design stores the immutable per-QR design snapshot.

alter table public.qr_codes add column if not exists qr_design jsonb;
alter table public.qr_codes alter column qr_design set default '{}'::jsonb;
update public.qr_codes qr
set qr_design = coalesce(style.config, '{}'::jsonb)
from public.qr_styles style
where qr.style_id = style.id
  and (qr.qr_design is null or qr.qr_design = '{}'::jsonb);
update public.qr_codes set qr_design = '{}'::jsonb where qr_design is null;

alter table public.qr_codes drop constraint if exists qr_codes_qr_type_check;
alter table public.qr_codes
  add constraint qr_codes_qr_type_check check (qr_type in (
    'url','product','vcard','multi','wifi','sms','email','whatsapp','text','phone',
    'menu','feedback','booking','doc','appstore','event','location','document',
    'audio','coupon'
  ));

alter table public.qr_styles add column if not exists category text not null default 'custom';
alter table public.qr_styles add column if not exists visibility text not null default 'private';
alter table public.qr_styles add column if not exists description text;
alter table public.qr_styles add column if not exists preview_url text;
alter table public.qr_styles drop constraint if exists qr_styles_visibility_check;
alter table public.qr_styles
  add constraint qr_styles_visibility_check check (visibility in ('system','public','private'));

create table if not exists public.qr_template_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.qr_styles add column if not exists collection_id uuid references public.qr_template_collections(id) on delete set null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (username is null or username ~ '^[A-Za-z0-9_-]{3,12}$')
);
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username)) where username is not null;

create table if not exists public.booking_forms (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null unique references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.booking_forms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 1 check (capacity between 1 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint booking_slots_time_check check (ends_at > starts_at)
);

create index if not exists idx_qr_styles_visibility_category on public.qr_styles(visibility, category);
create index if not exists idx_qr_styles_collection on public.qr_styles(collection_id);
create index if not exists idx_qr_template_collections_user_created on public.qr_template_collections(user_id, created_at desc);
create index if not exists idx_booking_forms_user on public.booking_forms(user_id);
create index if not exists idx_booking_slots_form_start on public.booking_slots(form_id, starts_at);

create or replace function public.touch_user_owned_resource_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_qr_template_collections_updated_at on public.qr_template_collections;
create trigger trg_qr_template_collections_updated_at before update on public.qr_template_collections
for each row execute function public.touch_user_owned_resource_updated_at();
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.touch_user_owned_resource_updated_at();
drop trigger if exists trg_booking_forms_updated_at on public.booking_forms;
create trigger trg_booking_forms_updated_at before update on public.booking_forms
for each row execute function public.touch_user_owned_resource_updated_at();

alter table public.qr_styles enable row level security;
alter table public.qr_template_collections enable row level security;
alter table public.profiles enable row level security;
alter table public.booking_forms enable row level security;
alter table public.booking_slots enable row level security;

drop policy if exists authenticated_manage_own_qr_styles on public.qr_styles;
drop policy if exists qr_styles_select_visible on public.qr_styles;
drop policy if exists qr_styles_insert_private on public.qr_styles;
drop policy if exists qr_styles_update_private on public.qr_styles;
drop policy if exists qr_styles_delete_private on public.qr_styles;
create policy qr_styles_select_visible on public.qr_styles for select to anon, authenticated
using (visibility in ('system','public') or (select auth.uid()) = user_id);
create policy qr_styles_insert_private on public.qr_styles for insert to authenticated
with check ((select auth.uid()) = user_id and visibility = 'private');
create policy qr_styles_update_private on public.qr_styles for update to authenticated
using ((select auth.uid()) = user_id and visibility = 'private')
with check ((select auth.uid()) = user_id and visibility = 'private');
create policy qr_styles_delete_private on public.qr_styles for delete to authenticated
using ((select auth.uid()) = user_id and visibility = 'private');

drop policy if exists qr_template_collections_owner_all on public.qr_template_collections;
create policy qr_template_collections_owner_all on public.qr_template_collections for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_owner_insert on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profiles_owner_update on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists booking_forms_owner_all on public.booking_forms;
create policy booking_forms_owner_all on public.booking_forms for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists booking_slots_owner_all on public.booking_slots;
create policy booking_slots_owner_all on public.booking_slots for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots from anon;
grant select, insert, update, delete on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots to authenticated;
grant all on public.qr_template_collections, public.profiles, public.booking_forms, public.booking_slots to service_role;
grant select, insert, update, delete on public.qr_styles to authenticated;

-- Compatibility views requested by the product vocabulary. These are
-- security-invoker views over the canonical tables and therefore obey RLS.
create or replace view public.qr_templates with (security_invoker = true) as
select id, user_id as owner_id, name, description, category, visibility,
       config, preview_url, collection_id, created_at, updated_at
from public.qr_styles;

create or replace view public.qr_designs with (security_invoker = true) as
select id as qr_id, user_id, style_id as template_id, qr_design as config, updated_at
from public.qr_codes;

create or replace view public.qr_scans with (security_invoker = true) as
select * from public.scan_logs;

grant select on public.qr_templates, public.qr_designs, public.qr_scans to authenticated;
grant select on public.qr_templates to anon;

notify pgrst, 'reload schema';

create extension if not exists pgcrypto;

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  verification_token text not null,
  status text not null default 'pending',
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_domains drop constraint if exists custom_domains_status_check;
alter table public.custom_domains
  add constraint custom_domains_status_check check (status in ('pending', 'verified', 'failed'));

create unique index if not exists idx_custom_domains_domain_unique on public.custom_domains (lower(domain));
create index if not exists idx_custom_domains_user_created on public.custom_domains (user_id, created_at desc);

-- public.touch_user_owned_resource_updated_at() 20260622111833_qr_template_profile_hardening.sql'de
-- tanımlandı; updated_at'ı güncelleyen genel amaçlı trigger fonksiyonu burada yeniden kullanılıyor.
drop trigger if exists trg_custom_domains_updated_at on public.custom_domains;
create trigger trg_custom_domains_updated_at
before update on public.custom_domains
for each row execute function public.touch_user_owned_resource_updated_at();

alter table public.custom_domains enable row level security;

drop policy if exists custom_domains_owner_all on public.custom_domains;
create policy custom_domains_owner_all on public.custom_domains
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.custom_domains from anon;
grant select, insert, update, delete on public.custom_domains to authenticated;

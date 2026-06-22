-- Sistem yedeklerinin (DB dump, storage sync, restore drill) çalışma
-- geçmişini tutar. Sadece sunucu tarafı (servis anahtarı) tarafından
-- yazılır/okunur — RLS gerekmez, hiçbir tarayıcı istemcisi bu tabloya
-- doğrudan erişmez (admin/owner kontrolü /api/admin/backups rotasında yapılır).
create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('db', 'storage', 'restore_test')),
  status text not null check (status in ('success', 'failed')),
  started_at timestamptz,
  finished_at timestamptz not null default now(),
  size_bytes bigint,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_backup_runs_kind_finished_at
  on public.backup_runs (kind, finished_at desc);

alter table public.backup_runs enable row level security;
-- Kasıtlı olarak hiçbir politika eklenmedi: tüm okuma/yazma servis anahtarıyla
-- (sunucu tarafı) yapılır, RLS varsayılan-engelle davranışıyla tarayıcıdan
-- doğrudan erişimi tamamen kapatır.

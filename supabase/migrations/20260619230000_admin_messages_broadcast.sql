-- Admin bildirim sistemine kitle/audience bazlı toplu gönderim (fan-out) desteği.
-- admin_messages tablosu zaten var (RLS: to_user_id = auth.uid()) — burada
-- sadece bir gönderim grubunu (tek satır da olabilir, N satır da) birbirine
-- bağlayan ve admin listesinde özet göstermeye yarayan kolonlar ekleniyor.
-- Idempotent: tekrar çalıştırılabilir.

alter table public.admin_messages
  add column if not exists batch_id uuid;

alter table public.admin_messages
  add column if not exists audience_type text;

alter table public.admin_messages
  drop constraint if exists admin_messages_audience_type_check;

alter table public.admin_messages
  add constraint admin_messages_audience_type_check
  check (audience_type is null or audience_type in ('single', 'plan', 'organization', 'all'));

alter table public.admin_messages
  add column if not exists audience_label text;

create index if not exists idx_admin_messages_batch_id on public.admin_messages(batch_id);

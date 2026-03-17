-- ================================================================
--  QR HUB — Avatar Storage Setup (optional but recommended)
--  Supabase → SQL Editor → Yeni sorgu → Çalıştır
-- ================================================================

-- 1) Create bucket (public so UI can show images without signing)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 2) RLS policies for avatars bucket
-- Path convention: avatars/<auth.uid()>/avatar.<ext>

-- Read: anyone can read (bucket is public), but still allow select to authenticated for safety.
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

-- Insert: only owner can upload under their folder
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Update: only owner
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Delete: only owner
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );


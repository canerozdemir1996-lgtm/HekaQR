-- Admin tarafında mesaj silme artık kalıcı değil — admin kendi gönderdiği
-- mesajları "sildiğinde" bu kolon doldurulur, gerçek satır 30 günlük retention
-- temizliğine kadar durur ve geri alınabilir. Kullanıcı tarafının kendi inbox'ı
-- için zaten var olan deleted_by_user_at ile karıştırılmaz (ayrı kavram: admin
-- kendi gönderim listesinden gizliyor, kullanıcının görmesini etkilemez).
-- Idempotent: tekrar çalıştırılabilir.

alter table public.admin_messages
  add column if not exists deleted_by_admin_at timestamptz;

create index if not exists idx_admin_messages_deleted_by_admin_at
  on public.admin_messages(deleted_by_admin_at);

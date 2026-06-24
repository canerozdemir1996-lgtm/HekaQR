-- Kullanıcının kendi telefon numarası: hem admin panelden manuel SMS
-- gönderiminin hedefi, hem de rezervasyon/sipariş/geri bildirim geldiğinde
-- QR sahibine otomatik SMS bildirimi için kullanılır.
alter table public.profiles add column if not exists phone text;

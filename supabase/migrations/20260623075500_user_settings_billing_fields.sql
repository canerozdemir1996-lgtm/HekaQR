-- app/api/v1/settings/route.ts ve /dashboard/profile, /dashboard/settings
-- sayfaları user_settings üzerinde fatura/iletişim alanları bekliyor ama
-- bu kolonlar hiçbir migration'da oluşturulmamıştı ("Could not find the
-- 'billing_address' column of 'user_settings' in the schema cache").

alter table public.user_settings add column if not exists billing_name text;
alter table public.user_settings add column if not exists company_name text;
alter table public.user_settings add column if not exists tax_office text;
alter table public.user_settings add column if not exists tax_number text;
alter table public.user_settings add column if not exists invoice_email text;
alter table public.user_settings add column if not exists billing_address text;
alter table public.user_settings add column if not exists billing_city text;
alter table public.user_settings add column if not exists billing_country text;
alter table public.user_settings add column if not exists payment_method_label text;
alter table public.user_settings add column if not exists notification_email text;
alter table public.user_settings add column if not exists security_contact_email text;

notify pgrst, 'reload schema';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS tax_office text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS invoice_email text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_country text,
  ADD COLUMN IF NOT EXISTS payment_method_label text,
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS security_contact_email text;

GRANT SELECT, INSERT, UPDATE ON user_settings TO service_role;

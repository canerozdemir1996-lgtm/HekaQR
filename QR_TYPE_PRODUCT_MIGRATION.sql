-- ================================================================
-- QR HUB — Add qr_type = 'product'
-- Run in Supabase SQL editor
-- ================================================================

-- 1) Remove existing qr_type check constraints (if any)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.qr_codes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%qr_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 2) Recreate qr_type check constraint with product included
ALTER TABLE public.qr_codes
  ADD CONSTRAINT qr_codes_qr_type_check
  CHECK (qr_type IN ('url','product','vcard','wifi','sms','email','whatsapp','text','phone'));


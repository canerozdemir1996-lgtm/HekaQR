-- ================================================================
--  DYNAMIC QR CODES - Dinamik QR Kodları Ekleme
--  Version: 1.0
-- ================================================================

-- 1. qr_codes tablosuna yeni alanlar ekle
ALTER TABLE qr_codes 
ADD COLUMN IF NOT EXISTS is_dynamic boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS dynamic_content jsonb DEFAULT NULL;

-- 2. Dinamik QR kodları için yeni tablo (içerik geçmişi)
CREATE TABLE IF NOT EXISTS dynamic_qr_history (
  id              bigserial       PRIMARY KEY,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  old_content     jsonb           NOT NULL,
  new_content     jsonb           NOT NULL,
  changed_by      uuid            REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_qr_history ON dynamic_qr_history (qr_id, changed_at DESC);

-- 3. RLS - Dinamik geçmiş
ALTER TABLE dynamic_qr_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dynamic_history_read" ON dynamic_qr_history 
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = dynamic_qr_history.qr_id
      AND q.user_id = auth.uid()
  ));

CREATE POLICY "dynamic_history_insert" ON dynamic_qr_history 
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 4. Trigger: QR güncellemeleri kaydet
CREATE OR REPLACE FUNCTION fn_track_dynamic_content()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_dynamic = true AND NEW.dynamic_content IS NOT NULL THEN
    IF OLD.dynamic_content IS DISTINCT FROM NEW.dynamic_content THEN
      INSERT INTO dynamic_qr_history (qr_id, old_content, new_content, changed_by)
      VALUES (NEW.id, OLD.dynamic_content, NEW.dynamic_content, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dynamic_qr_history
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION fn_track_dynamic_content();

-- 5. Yeni QR türü: 'product' ve diğerleri
ALTER TABLE qr_codes 
DROP CONSTRAINT IF EXISTS qr_type_check;

ALTER TABLE qr_codes ADD CONSTRAINT qr_type_check 
  CHECK (qr_type IN (
    'url', 'vcard', 'wifi', 'sms', 'email', 
    'whatsapp', 'text', 'phone', 'product',
    'event', 'location', 'document', 'audio', 'coupon', 'feedback'
  ));

-- 6. Yeni alanlar: Event, Location, Document için
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS event_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS document_urls text[] DEFAULT '{}';

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_qr_dynamic ON qr_codes (is_dynamic, user_id) WHERE is_dynamic = true;

-- ─── Slug Kalıcılığı: Soft-delete + Immutability ────────────────────────────
-- Run once in Supabase SQL Editor.
--
-- Kök neden: DELETE /api/v1/qrcodes/[id] hard delete yapıyordu — silinen bir
-- QR'ın short_slug'ı hiçbir yerde rezerve edilmiyordu, hemen başka bir QR'a
-- atanabiliyordu. Basılı QR kodları 10+ yıl çalışır kalmalı; bir slug'ın
-- anlamı zamanla değişmemeli. Bu migration:
--   1. deleted_at kolonu ekler (soft delete)
--   2. short_slug'ı DB seviyesinde immutable yapar (trigger)
--   3. soft-delete edilmiş satırlar dahil slug'ların tekrar kullanılamamasını
--      garanti eden unique index kurar
-- İdempotent: birden fazla kez çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- short_slug immutable: oluşturulduktan sonra hiçbir UPDATE değiştiremez
-- (uygulama kodu zaten short_slug'ı PUT'ta göndermiyor, bu DB-seviyesi garanti)
CREATE OR REPLACE FUNCTION prevent_qr_slug_change() RETURNS trigger AS $$
BEGIN
  IF NEW.short_slug IS DISTINCT FROM OLD.short_slug THEN
    RAISE EXCEPTION 'short_slug is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qr_codes_slug_immutable ON qr_codes;
CREATE TRIGGER trg_qr_codes_slug_immutable
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION prevent_qr_slug_change();

-- Soft-delete edilmiş satırlar dahil (deleted_at IS NOT NULL olsa da) slug
-- benzersizliği korunur — WHERE'siz unique index, partial index DEĞİL.
-- Mevcut tabloda zaten çakışan/case-farklı slug varsa bu adım hata verir;
-- önce "SELECT lower(short_slug), count(*) FROM qr_codes GROUP BY 1 HAVING count(*) > 1"
-- ile kontrol edin.
DROP INDEX IF EXISTS qr_codes_short_slug_unique;
CREATE UNIQUE INDEX qr_codes_short_slug_unique ON qr_codes (lower(short_slug));

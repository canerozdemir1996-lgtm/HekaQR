-- menu_snapshots: QR menü içeriğinin statik snapshot'ı.
-- Ana uygulama çevrimdışıyken nginx / Supabase Storage üzerinden sunulabilir.
-- Her menü güncellemesinde tetiklenir; snapshot_at son başarılı oluşturma zamanını gösterir.

CREATE TABLE IF NOT EXISTS menu_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id        uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  slug         text NOT NULL,            -- short_slug, hızlı lookup için
  html         text,                     -- tam statik HTML (fallback sayfası)
  menu_json    jsonb,                    -- ham menü verisi
  snapshot_at  timestamptz,             -- son başarılı oluşturma
  error        text,                     -- son hata (varsa)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qr_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_snapshots_slug ON menu_snapshots (slug);

ALTER TABLE menu_snapshots ENABLE ROW LEVEL SECURITY;
-- Public endpoint okuyabilsin (ana uygulama down olsa bile)
CREATE POLICY IF NOT EXISTS "menu_snapshots_public_read"
  ON menu_snapshots FOR SELECT USING (true);

-- Sadece service_role yazabilir
GRANT ALL ON menu_snapshots TO service_role;
REVOKE INSERT, UPDATE, DELETE ON menu_snapshots FROM anon, authenticated;

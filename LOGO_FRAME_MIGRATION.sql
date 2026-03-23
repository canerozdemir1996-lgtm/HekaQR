-- ================================================================
--  LOGO & FRAME DESIGN - Logo ve Çerçeve Tasarımı
--  Version: 1.0
-- ================================================================

-- 1. qr_codes tablosuna tasarım alanları ekle
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qr_design jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS frame_style text DEFAULT NULL;

-- qr_design örneği:
-- {
--   "bodyShape": "dots|square",  -- QR gövdesi şekli
--   "cornerShape": "square|rounded|circle",  -- köşe şekli
--   "bodyColor": "#000000",  -- QR rengi
--   "cornerColor": "#000000",  -- köşe rengi
--   "backgroundColor": "#ffffff",  -- arka plan rengi
--   "gradient": {color1: "#...", color2: "#...", angle: 45}  -- gradient
-- }

-- frame_style örneği: "default", "fun", "professional", "minimal", "retro"

-- 2. QR tasarım şablonları (önceden tanımlı)
CREATE TABLE IF NOT EXISTS qr_design_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL UNIQUE,
  description     text,
  design_config   jsonb       NOT NULL,
  frame_style     text,
  is_public       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO qr_design_templates (name, description, design_config, frame_style, is_public) VALUES
('Modern', 'Modern minimal tasarım', '{"bodyShape":"dots","cornerShape":"square","bodyColor":"#000000","cornerColor":"#000000","backgroundColor":"#ffffff","gradient":null}', 'default', true),
('Pro', 'Profesyonel ve temiz', '{"bodyShape":"square","cornerShape":"rounded","bodyColor":"#1e40af","cornerColor":"#1e40af","backgroundColor":"#ffffff","gradient":null}', 'professional', true),
('Vibrant', 'Renkli ve dinamik', '{"bodyShape":"dots","cornerShape":"circle","bodyColor":"#d946ef","cornerColor":"#f59e0b","backgroundColor":"#ffffff","gradient":{"color1":"#d946ef","color2":"#f59e0b","angle":45}}', 'fun', true),
('Dark Mode', 'Koyu tema', '{"bodyShape":"square","cornerShape":"square","bodyColor":"#ffffff","cornerColor":"#ffffff","backgroundColor":"#1f2937","gradient":null}', 'minimal', true),
('Retro', 'Retro stil', '{"bodyShape":"square","cornerShape":"square","bodyColor":"#0f172a","cornerColor":"#0f172a","backgroundColor":"#fef3c7","gradient":null}', 'retro', true)
ON CONFLICT (name) DO NOTHING;

-- 3. Logo upload için alanlar
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS logo_transparent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS logo_size_percent integer DEFAULT 30;

-- Logo başinde logoların saklandığı path'i düşün (örn: /uploads/logos/{user_id}/{qr_id}/logo.png)

-- 4. Kullanıcı tasarımlarını kaydetme
CREATE TABLE IF NOT EXISTS user_qr_designs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  design_config   jsonb       NOT NULL,
  frame_style     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_designs ON user_qr_designs (user_id, created_at DESC);

-- 5. RLS
ALTER TABLE qr_design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_qr_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_templates_public" ON qr_design_templates
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "user_designs_own" ON user_qr_designs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. İndeksler
CREATE INDEX IF NOT EXISTS idx_qr_design ON qr_codes (user_id) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_frame ON qr_codes (frame_style);

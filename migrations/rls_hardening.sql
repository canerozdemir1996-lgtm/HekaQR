-- ─── RLS Hardening ────────────────────────────────────────────────────────
-- Run once in Supabase SQL Editor.
--
-- Kök neden: app/api/v1/* route'ları service_role anahtarıyla çalışıyor —
-- service_role RLS'i bypass eder, yani yetki kontrolü tamamen uygulama
-- kodundadır (canReadQr/canEditQr/canDeleteQr, vb.). Ancak lib/supabase.ts
-- içindeki bazı fonksiyonlar (bulkDeleteQrCodes, fetchDailyStats,
-- fetchDeviceStats, fetchRecentScans, fetchUniqueScanCount) tarayıcıdan
-- DOĞRUDAN anon key ile PostgREST'e gidiyor. RLS kapalıyken bu yol hiçbir
-- yetki kontrolünden geçmeden tüm kullanıcıların verisine erişebiliyordu.
--
-- İdempotent: birden fazla kez çalıştırılabilir (DROP POLICY IF EXISTS +
-- CREATE POLICY, ADD COLUMN IF NOT EXISTS, vb.).
-- ─────────────────────────────────────────────────────────────────────────

-- ═══ qr_codes ═══
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_codes_select ON qr_codes;
CREATE POLICY qr_codes_select ON qr_codes FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM organization_members om
             WHERE om.org_id = qr_codes.organization_id
               AND om.user_id = auth.uid() AND om.status = 'active')
);

DROP POLICY IF EXISTS qr_codes_insert ON qr_codes;
CREATE POLICY qr_codes_insert ON qr_codes FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (organization_id IS NULL OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = qr_codes.organization_id AND om.user_id = auth.uid()
      AND om.status = 'active' AND om.role IN ('owner','admin','editor')))
);

DROP POLICY IF EXISTS qr_codes_update ON qr_codes;
CREATE POLICY qr_codes_update ON qr_codes FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM organization_members om
             WHERE om.org_id = qr_codes.organization_id AND om.user_id = auth.uid()
               AND om.status = 'active' AND om.role IN ('owner','admin','editor'))
);

DROP POLICY IF EXISTS qr_codes_delete ON qr_codes;
CREATE POLICY qr_codes_delete ON qr_codes FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM organization_members om
             WHERE om.org_id = qr_codes.organization_id AND om.user_id = auth.uid()
               AND om.status = 'active' AND om.role IN ('owner','admin'))
);

REVOKE ALL ON qr_codes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_codes TO service_role, authenticated;

-- ═══ scan_logs ═══
-- Yazma her zaman service_role (redirect handler, app/q/[slug]/route.ts) üzerinden olur.
-- İstemciden (anon/authenticated) sadece kendi QR'larına ait taramaları SELECT edebilmeli.
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scan_logs_select ON scan_logs;
CREATE POLICY scan_logs_select ON scan_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM qr_codes q WHERE q.id = scan_logs.qr_id
    AND (q.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM organization_members om
                    WHERE om.org_id = q.organization_id AND om.user_id = auth.uid() AND om.status = 'active')))
);

REVOKE ALL ON scan_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON scan_logs FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scan_logs TO service_role;
GRANT SELECT ON scan_logs TO authenticated;

-- ═══ qr_folders ═══ (tek sahip, user_id ile)
ALTER TABLE qr_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_folders_owner ON qr_folders;
CREATE POLICY qr_folders_owner ON qr_folders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON qr_folders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_folders TO service_role, authenticated;

-- ═══ qr_styles ═══ (introspection ile doğrulandı: user_id kolonu YOK — global/paylaşılan tablo)
ALTER TABLE qr_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_styles_select_all ON qr_styles;
CREATE POLICY qr_styles_select_all ON qr_styles FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON qr_styles FROM anon, authenticated;
GRANT SELECT ON qr_styles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_styles TO service_role;

-- ═══ user_settings ═══ (tek sahip, user_id ile)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_owner ON user_settings;
CREATE POLICY user_settings_owner ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON user_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO service_role, authenticated;

-- ═══ api_keys / user_mfa_settings ═══
-- Bu tablolar her zaman service_role üzerinden okunup yazılıyor (lib/server/api-helpers.ts,
-- authOptions.ts) — istemcinin (anon/authenticated) hiçbir şekilde doğrudan erişmesi gerekmiyor.
-- Politika eklemiyoruz: RLS açık + hiç policy yok = service_role dışında kimse hiçbir satır göremez.
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON api_keys FROM anon, authenticated;
REVOKE ALL ON user_mfa_settings FROM anon, authenticated;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON user_mfa_settings TO service_role;

-- ═══ audit_logs ═══
-- Mevcut tabloda lib/middleware/auditLog.ts'in insert ettiği kolonlardan dördü eksikti
-- (api_key_hash, resource_id, status_code, ip_address, details) — bu yüzden her QR
-- create/update/delete'te audit log insert'i "column does not exist" hatasıyla sessizce
-- başarısız oluyordu (try/catch içinde yutuluyor). Eksik kolonları ekliyoruz.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS api_key_hash text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id uuid;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status_code integer;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_own ON audit_logs;
CREATE POLICY audit_logs_select_own ON audit_logs FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO service_role;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS monthly_scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_scan_period text;

GRANT SELECT, INSERT, UPDATE ON user_settings TO service_role;

-- Aylık tarama sayacını atomik şekilde artırır; plan limitine ulaşıldıysa
-- sayacı artırmadan false döner (çağıran taraf bu durumda taramayı loglamayı
-- atlar ama ziyaretçiyi normal şekilde yönlendirmeye devam eder).
CREATE OR REPLACE FUNCTION increment_monthly_scan_count(
  p_user_id uuid,
  p_period text,
  p_cap integer
) RETURNS boolean AS $$
DECLARE
  v_count integer;
  v_period text;
  v_did_count boolean;
BEGIN
  SELECT monthly_scan_count, monthly_scan_period
    INTO v_count, v_period
    FROM user_settings
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF v_period IS DISTINCT FROM p_period THEN
    v_count := 0;
  END IF;

  IF p_cap >= 0 AND v_count >= p_cap THEN
    v_did_count := false;
  ELSE
    v_did_count := true;
    v_count := v_count + 1;
  END IF;

  UPDATE user_settings
    SET monthly_scan_count = v_count, monthly_scan_period = p_period
    WHERE user_id = p_user_id;

  RETURN v_did_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_monthly_scan_count(uuid, text, integer) TO service_role;

-- Free planda tarama kaydı (scan_logs) saklama süresi 30 gün ile sınırlı;
-- Starter/Pro/Enterprise'da süre sınırı yok. scripts/cleanup-scan-logs.sh
-- tarafından günlük çağrılır.
CREATE OR REPLACE FUNCTION cleanup_free_plan_scan_logs() RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH free_users AS (
    SELECT user_id FROM user_settings WHERE COALESCE(current_plan, 'free') = 'free'
  ),
  doomed AS (
    SELECT sl.id
    FROM scan_logs sl
    JOIN qr_codes qr ON qr.id = sl.qr_id
    WHERE qr.user_id IN (SELECT user_id FROM free_users)
      AND sl.scanned_at < now() - interval '30 days'
  )
  DELETE FROM scan_logs WHERE id IN (SELECT id FROM doomed);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_free_plan_scan_logs() TO service_role;

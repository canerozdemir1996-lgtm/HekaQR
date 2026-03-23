-- ================================================================
--  ADVANCED ANALYTICS - Gelişmiş Analitik
--  Version: 1.0
-- ================================================================

-- 1. Conversion events tablosu
CREATE TABLE IF NOT EXISTS conversion_events (
  id              bigserial       PRIMARY KEY,
  scan_log_id     bigint          REFERENCES scan_logs(id) ON DELETE SET NULL,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  event_type      text            NOT NULL, -- 'page_view', 'form_submit', 'purchase', 'signup', 'custom'
  event_value     numeric(12,2),
  event_data      jsonb           DEFAULT '{}'::jsonb,
  tracked_at      timestamptz     NOT NULL DEFAULT now(),
  created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_qr ON conversion_events (qr_id, tracked_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_type ON conversion_events (event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_scan ON conversion_events (scan_log_id);

-- 2. Anomaly detection logs (şüpheli taramalar)
CREATE TABLE IF NOT EXISTS anomaly_logs (
  id              bigserial       PRIMARY KEY,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  anomaly_type    text            NOT NULL, -- 'burst_scans', 'same_ip', 'bot_like', 'geographic_anomaly'
  severity        text            NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  details         jsonb           DEFAULT '{}'::jsonb,
  detected_at     timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_qr ON anomaly_logs (qr_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_severity ON anomaly_logs (severity);

-- 3. Cohort analysis tablosu
CREATE TABLE IF NOT EXISTS cohort_data (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id           uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  cohort_date     date        NOT NULL, -- taramanın yapıldığı gün
  cohort_age      integer     NOT NULL, -- kaç gün sonra tekrar tarandı
  retention_count integer     NOT NULL DEFAULT 1,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_unique 
  ON cohort_data (qr_id, cohort_date, cohort_age);
CREATE INDEX IF NOT EXISTS idx_cohort_date ON cohort_data (cohort_date DESC);

-- 4. Daily summary (performans için cache)
CREATE TABLE IF NOT EXISTS scan_daily_summary (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id           uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scan_date       date        NOT NULL,
  scan_count      integer     NOT NULL DEFAULT 0,
  unique_ips      integer     NOT NULL DEFAULT 0,
  unique_fingerprints integer NOT NULL DEFAULT 0,
  top_country     text,
  top_device      text,
  conversion_count integer     NOT NULL DEFAULT 0,
  avg_response_time_ms numeric(8,2),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_unique ON scan_daily_summary (qr_id, scan_date);
CREATE INDEX IF NOT EXISTS idx_daily_date ON scan_daily_summary (scan_date DESC);

-- 5. RLS Policies
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversion_read" ON conversion_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = conversion_events.qr_id
      AND q.user_id = auth.uid()
  ));

CREATE POLICY "conversion_insert" ON conversion_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anomaly_read" ON anomaly_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = anomaly_logs.qr_id
      AND q.user_id = auth.uid()
  ));

CREATE POLICY "cohort_read" ON cohort_data
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = cohort_data.qr_id
      AND q.user_id = auth.uid()
  ));

CREATE POLICY "daily_summary_read" ON scan_daily_summary
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = scan_daily_summary.qr_id
      AND q.user_id = auth.uid()
  ));

-- 6. Analitik helper tablosu (user settings)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tracking_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS anomaly_detection_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS anomaly_alert_threshold integer DEFAULT 100, -- burst limit per hour
ADD COLUMN IF NOT EXISTS conversion_tracking_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS retention_days integer DEFAULT 90; -- retention analytics için gün sayısı

// ─── Rate Limiting & Audit Logging ─────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX = 100; // API key başına 100 istek/dakika

/**
 * Rate limiting middleware (API key tabanlı)
 */
export function checkRateLimit(apiKeyHash: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_STORE.get(apiKeyHash);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_STORE.set(apiKeyHash, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

/**
 * Audit log: tüm API işlemleri log et
 */
export async function logAuditEvent(
  supabase: any,
  event: {
    user_id?: string;
    api_key_hash?: string;
    action: string; // 'create', 'update', 'delete', 'read'
    resource: string; // 'qr_code', 'user', 'webhook'
    resource_id?: string;
    status: "success" | "failure";
    status_code?: number;
    ip_address?: string;
    details?: Record<string, any>;
  }
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: event.user_id,
      api_key_hash: event.api_key_hash,
      action: event.action,
      resource: event.resource,
      resource_id: event.resource_id,
      status: event.status,
      status_code: event.status_code || 200,
      ip_address: event.ip_address,
      details: event.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}

/**
 * Audit trail ekle (QR değişiklikler)
 */
export async function logQrChange(
  supabase: any,
  qrId: string,
  userId: string,
  action: "created" | "updated" | "deleted",
  changes?: Record<string, { old: any; new: any }>
) {
  try {
    await supabase.from("qr_change_logs").insert({
      qr_id: qrId,
      user_id: userId,
      action,
      changes: changes || {},
      changed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging QR change:", error);
  }
}

/**
 * API Rate limit response
 */
export function createRateLimitResponse() {
  return new NextResponse(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many requests. Maximum 100 requests per minute.",
      retryAfter: 60,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": "60",
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Webhook delivery log
 */
export async function logWebhookDelivery(
  supabase: any,
  webhookId: string,
  status: number,
  responseTime: number,
  error?: string
) {
  try {
    await supabase.from("webhook_delivery_logs").insert({
      webhook_id: webhookId,
      status_code: status,
      response_time_ms: responseTime,
      error_message: error,
      delivered_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging webhook delivery:", error);
  }
}

/**
 * Veritabanında audit tablolar oluştur (migration)
 */
export const AUDIT_MIGRATION = `
-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id              bigserial       PRIMARY KEY,
  user_id         uuid            REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_hash    text,
  action          text            NOT NULL,
  resource        text            NOT NULL,
  resource_id     uuid,
  status          text            NOT NULL CHECK (status IN ('success', 'failure')),
  status_code     integer,
  ip_address      text,
  details         jsonb           DEFAULT '{}'::jsonb,
  created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action, created_at DESC);

-- QR Change Logs
CREATE TABLE IF NOT EXISTS qr_change_logs (
  id              bigserial       PRIMARY KEY,
  qr_id           uuid            NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id         uuid            NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text            NOT NULL,
  changes         jsonb           DEFAULT '{}'::jsonb,
  changed_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_changes ON qr_change_logs (qr_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_changes_user ON qr_change_logs (user_id, changed_at DESC);

-- Webhook Subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id           uuid        NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggers        text[]      NOT NULL DEFAULT array['scan_received'],
  webhook_url     text        NOT NULL,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_unique ON webhook_subscriptions (qr_id, user_id);

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id              bigserial       PRIMARY KEY,
  webhook_id      uuid            NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  status_code     integer,
  response_time_ms integer,
  error_message   text,
  delivered_at    timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs ON webhook_delivery_logs (webhook_id, delivered_at DESC);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read" ON audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "qr_changes_read" ON qr_change_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes q
    WHERE q.id = qr_change_logs.qr_id AND q.user_id = auth.uid()
  ));

CREATE POLICY "webhooks_own" ON webhook_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
`;

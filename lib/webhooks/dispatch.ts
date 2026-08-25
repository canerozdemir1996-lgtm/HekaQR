import crypto from "crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolveSeoAuditTarget, validateSeoAuditUrl } from "@/lib/server/seo-audit";

export type WebhookEventType = "menu_order.created" | "booking.created" | "feedback.created" | "lead.created" | "exam.submitted";

export type WebhookEvent = {
  type: WebhookEventType;
  qrId: string;
  qrSlug: string;
  data: Record<string, unknown>;
};

export type DispatchResult =
  | { delivered: true; attempts: number; statusCode: number }
  | { delivered: false; attempts: number; error: string };

type FetchFn = typeof fetch;

const DEFAULT_RETRIES = 1; // ilk deneme + 1 tekrar = toplam 2 deneme
const TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export async function postPublicJson(
  rawUrl: string,
  body: string,
  headers: Record<string, string> = {},
  timeoutMs = TIMEOUT_MS,
): Promise<{ ok: boolean; status: number }> {
  const url = validateSeoAuditUrl(rawUrl);
  const target = await resolveSeoAuditTarget(url);

  return new Promise((resolve, reject) => {
    const secure = url.protocol === "https:";
    const request = (secure ? httpsRequest : httpRequest)({
      protocol: url.protocol,
      hostname: target.address,
      port: secure ? 443 : 80,
      path: `${url.pathname}${url.search}`,
      method: "POST",
      servername: secure ? url.hostname : undefined,
      headers: {
        Host: url.host,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...headers,
      },
    }, response => {
      let received = 0;
      response.on("data", chunk => {
        received += Buffer.byteLength(chunk);
        if (received > MAX_RESPONSE_BYTES) request.destroy(new Error("Webhook response too large"));
      });
      response.on("end", () => resolve({
        ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
        status: response.statusCode ?? 0,
      }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Webhook request timed out")));
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

export function buildWebhookPayload(event: WebhookEvent) {
  return JSON.stringify({
    event: event.type,
    qr_id: event.qrId,
    qr_slug: event.qrSlug,
    data: event.data,
    sent_at: new Date().toISOString(),
  });
}

export function signWebhookPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * QR'ın webhook_url'ine sipariş/rezervasyon/geri bildirim olayını HMAC imzalı
 * POST ile gönderir. Best-effort: webhook_url boşsa null döner, gönderim
 * başarısız olursa 1 kez daha denenir, sonunda yine başarısız olursa
 * hiçbir hata fırlatmadan { delivered: false } döner — çağıran akış
 * (sipariş/rezervasyon/geri bildirim kaydı) bu yüzden bozulmaz.
 */
export async function dispatchWebhook(
  webhookUrl: string | null | undefined,
  event: WebhookEvent,
  opts: { secret?: string; fetchFn?: FetchFn; retries?: number; timeoutMs?: number } = {}
): Promise<DispatchResult | null> {
  if (!webhookUrl) return null;

  const secret = opts.secret ?? process.env.WEBHOOK_SIGNING_SECRET ?? "";
  const fetchFn = opts.fetchFn ?? fetch;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const maxAttempts = retries + 1;

  const body = buildWebhookPayload(event);
  const signature = secret ? signWebhookPayload(body, secret) : null;

  let lastError = "unknown error";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let response: { ok: boolean; status: number };
      if (opts.fetchFn) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let res: Response;
        try {
          res = await fetchFn(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-QRPublish-Event": event.type,
            ...(signature ? { "X-QRPublish-Signature": signature } : {}),
          },
          body,
          signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        response = { ok: res.ok, status: res.status };
      } else {
        response = await postPublicJson(webhookUrl, body, {
          "X-QRPublish-Event": event.type,
          ...(signature ? { "X-QRPublish-Signature": signature } : {}),
        }, timeoutMs);
      }
      if (response.ok) return { delivered: true, attempts: attempt, statusCode: response.status };
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unknown error";
    }
  }

  console.error("[dispatchWebhook] delivery failed", { webhookUrl, event: event.type, attempts: maxAttempts, error: lastError });
  return { delivered: false, attempts: maxAttempts, error: lastError };
}

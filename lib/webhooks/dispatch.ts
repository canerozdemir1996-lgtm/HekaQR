import crypto from "crypto";

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
      if (res.ok) return { delivered: true, attempts: attempt, statusCode: res.status };
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unknown error";
    }
  }

  console.error("[dispatchWebhook] delivery failed", { webhookUrl, event: event.type, attempts: maxAttempts, error: lastError });
  return { delivered: false, attempts: maxAttempts, error: lastError };
}

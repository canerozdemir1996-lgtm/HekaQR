const WHATSAPP_API_BASE = "https://graph.facebook.com/v20.0";

type FetchFn = typeof fetch;

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim());
}

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export type WhatsAppSendResult = { sent: boolean; error?: string };

/**
 * WhatsApp Business Cloud API (Meta) üzerinden tek bir metin mesajı gönderir.
 * Best-effort: WHATSAPP_PHONE_ID/WHATSAPP_ACCESS_TOKEN ayarlı değilse veya
 * gönderim hata verirse hiçbir hata fırlatmaz (Resend pattern'iyle aynı
 * yaklaşım) — çağıran akışı bozmaz.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  fetchFn: FetchFn = fetch,
): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) return { sent: false, error: "not_configured" };

  const normalized = normalizePhoneNumber(to);
  if (!normalized) return { sent: false, error: "invalid_number" };

  try {
    const res = await fetchFn(`${WHATSAPP_API_BASE}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalized,
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { sent: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sendWhatsAppMessage] failed", err);
    return { sent: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

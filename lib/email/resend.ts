import { Resend } from "resend";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { sanitizeHtml } from "@/lib/utils/htmlSanitizer";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "QR Publish <bildirim@qrpublish.com>";

let client: Resend | null = null;
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function isEmailChannelConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildBroadcastEmailHtml(title: string, body: string) {
  const origin = getPublicAppOrigin();
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">QR Publish</p>
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(title)}</h1>
    <div style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155;">${sanitizeHtml(body)}</div>
    <a href="${origin}/dashboard/messages" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#7c3aed;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">Panelde görüntüle</a>
  </div>
</body>
</html>`;
}

export type BroadcastEmailRecipient = { email: string; title: string; body: string };

/**
 * Best-effort e-posta gönderimi: RESEND_API_KEY ayarlı değilse sessizce atlar
 * (in-app bildirim zaten çalışmaya devam eder, e-posta opsiyonel bir katmandır).
 * Hiçbir hata fırlatmaz — admin yayın akışını e-posta sağlayıcısı kesintisi
 * bozmasın diye tüm gönderimler best-effort ve birbirinden bağımsızdır.
 */
export async function sendBroadcastEmails(recipients: BroadcastEmailRecipient[]) {
  const resend = getClient();
  if (!resend || recipients.length === 0) return { sent: 0, skipped: recipients.length };

  const results = await Promise.allSettled(
    recipients.map((r) =>
      resend.emails.send({
        from: FROM_ADDRESS,
        to: r.email,
        subject: r.title,
        html: buildBroadcastEmailHtml(r.title, r.body),
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, skipped: recipients.length - sent };
}

export type TransactionalEmailPayload = { to: string; subject: string; html: string };

/**
 * Tek alıcıya tekil (transactional) e-posta gönderir. Resend yapılandırılı
 * değilse veya gönderim hata verirse hiçbir hata fırlatmaz — çağıran akış
 * (sipariş/rezervasyon/geri bildirim kaydı) bu yüzden bozulmamalı.
 */
export async function sendOwnerNotificationEmail(payload: TransactionalEmailPayload): Promise<{ sent: boolean }> {
  const resend = getClient();
  if (!resend) return { sent: false };
  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return { sent: !result.error };
  } catch (err) {
    console.error("[sendOwnerNotificationEmail] failed", err);
    return { sent: false };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { sendOwnerNotificationEmail, type TransactionalEmailPayload } from "@/lib/email/resend";

export type OwnerNotificationEvent =
  | { kind: "menu_order"; qrTitle: string; tableNo: number; itemCount: number; subtotal: number; currency: string }
  | { kind: "booking"; qrTitle: string; customerName: string; appointmentDate: string; appointmentTime: string }
  | { kind: "feedback"; qrTitle: string; type: string; subject: string };

// sbAdmin()'in döndürdüğü gerçek Supabase istemcisini kabul eder; test'lerde
// aynı şekli taklit eden sahte (fake) bir nesne `as any` ile enjekte edilir
// (bkz. lib/admin/notifications.ts'deki resolveAudience ile aynı yaklaşım).
export type OwnerLookupClient = SupabaseClient<any, any, any, any, any>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}

export function buildOwnerNotificationContent(event: OwnerNotificationEvent): {
  subject: string;
  summary: string;
  panelPath: string;
} {
  if (event.kind === "menu_order") {
    return {
      subject: `Yeni sipariş: ${event.qrTitle}`,
      summary: `Masa ${event.tableNo}, ${event.itemCount} ürün, ₺${formatMoney(event.subtotal)} ${event.currency}`,
      panelPath: "/dashboard/orders",
    };
  }
  if (event.kind === "booking") {
    return {
      subject: `Yeni rezervasyon: ${event.qrTitle}`,
      summary: `${event.customerName} — ${event.appointmentDate} ${event.appointmentTime}`,
      panelPath: "/dashboard/bookings",
    };
  }
  return {
    subject: `Yeni geri bildirim: ${event.qrTitle}`,
    summary: `${event.subject} (${event.type})`,
    panelPath: "/dashboard/feedback",
  };
}

export function buildOwnerNotificationHtml(summary: string, panelUrl: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">QR Publish</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(summary)}</p>
    <a href="${panelUrl}" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#7c3aed;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">Panelde görüntüle</a>
  </div>
</body>
</html>`;
}

/**
 * QR sahibinin bildirim e-postasını çözer: önce user_settings.notification_email
 * override'ı, yoksa Supabase Auth'taki hesap e-postası.
 */
export async function resolveOwnerEmail(sb: OwnerLookupClient, userId: string): Promise<string | null> {
  const { data: settings } = await sb
    .from("user_settings")
    .select("notification_email")
    .eq("user_id", userId)
    .maybeSingle();
  const override = settings?.notification_email?.trim();
  if (override) return override;

  const { data, error } = await sb.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

type SendEmailFn = (payload: TransactionalEmailPayload) => Promise<{ sent: boolean }>;

/**
 * QR sahibine yeni sipariş/rezervasyon/geri bildirim bildirimi gönderir.
 * Best-effort: e-posta adresi bulunamazsa veya gönderim hata verirse hiçbir
 * hata fırlatmaz, çağıran API route'un asıl işlemini bozmaz.
 */
export async function notifyOwnerOfSubmission(
  sb: OwnerLookupClient,
  userId: string,
  event: OwnerNotificationEvent,
  sendEmail: SendEmailFn = sendOwnerNotificationEmail
): Promise<{ sent: boolean; reason?: "no_email" | "error" }> {
  try {
    const email = await resolveOwnerEmail(sb, userId);
    if (!email) return { sent: false, reason: "no_email" };

    const { subject, summary, panelPath } = buildOwnerNotificationContent(event);
    const html = buildOwnerNotificationHtml(summary, `${getPublicAppOrigin()}${panelPath}`);
    const result = await sendEmail({ to: email, subject, html });
    return { sent: result.sent };
  } catch (err) {
    console.error("[notifyOwnerOfSubmission] failed", err);
    return { sent: false, reason: "error" };
  }
}

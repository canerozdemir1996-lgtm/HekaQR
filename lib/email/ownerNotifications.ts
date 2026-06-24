import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { sendOwnerNotificationEmail, type TransactionalEmailPayload } from "@/lib/email/resend";
import { sendWhatsAppMessage, type WhatsAppSendResult } from "@/lib/notifications/whatsapp";

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

/**
 * QR sahibinin bildirim için aktifleştirdiği WhatsApp numarasını çözer
 * (profiles.notification_whatsapp_number) — kullanıcı bu numarayı ayarlar
 * sayfasından girip aktifleştirmediyse null döner ve WhatsApp kanalı atlanır.
 */
export async function resolveOwnerWhatsAppNumber(sb: OwnerLookupClient, userId: string): Promise<string | null> {
  const { data } = await sb
    .from("profiles")
    .select("notification_whatsapp_number")
    .eq("user_id", userId)
    .maybeSingle();
  const number = data?.notification_whatsapp_number?.trim();
  return number || null;
}

type SendEmailFn = (payload: TransactionalEmailPayload) => Promise<{ sent: boolean }>;
type SendWhatsAppFn = (to: string, message: string) => Promise<WhatsAppSendResult>;

export type NotifyOwnerResult = {
  email: { sent: boolean; reason?: "no_email" | "error" };
  whatsapp: { sent: boolean; reason?: "not_activated" | "error" };
};

/**
 * QR sahibine yeni sipariş/rezervasyon/geri bildirim bildirimi gönderir.
 * E-posta ve WhatsApp kanalları birbirinden bağımsız best-effort çalışır:
 * biri başarısız olsa veya hiç yapılandırılmamış olsa diğerini ve çağıran
 * API route'un asıl işlemini bozmaz.
 */
export async function notifyOwnerOfSubmission(
  sb: OwnerLookupClient,
  userId: string,
  event: OwnerNotificationEvent,
  sendEmail: SendEmailFn = sendOwnerNotificationEmail,
  sendWhatsApp: SendWhatsAppFn = sendWhatsAppMessage,
): Promise<NotifyOwnerResult> {
  const { subject, summary, panelPath } = buildOwnerNotificationContent(event);

  const emailResult = await (async (): Promise<NotifyOwnerResult["email"]> => {
    try {
      const email = await resolveOwnerEmail(sb, userId);
      if (!email) return { sent: false, reason: "no_email" };
      const html = buildOwnerNotificationHtml(summary, `${getPublicAppOrigin()}${panelPath}`);
      const result = await sendEmail({ to: email, subject, html });
      return { sent: result.sent };
    } catch (err) {
      console.error("[notifyOwnerOfSubmission] email failed", err);
      return { sent: false, reason: "error" };
    }
  })();

  const whatsappResult = await (async (): Promise<NotifyOwnerResult["whatsapp"]> => {
    try {
      const number = await resolveOwnerWhatsAppNumber(sb, userId);
      if (!number) return { sent: false, reason: "not_activated" };
      const result = await sendWhatsApp(number, `${subject}\n${summary}`);
      return { sent: result.sent };
    } catch (err) {
      console.error("[notifyOwnerOfSubmission] whatsapp failed", err);
      return { sent: false, reason: "error" };
    }
  })();

  return { email: emailResult, whatsapp: whatsappResult };
}

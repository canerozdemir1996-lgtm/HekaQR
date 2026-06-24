import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/account/export — KVKK/GDPR "verimi indir" isteği.
 * Yanıt şeması:
 * {
 *   exported_at: string (ISO),
 *   account: { id, email, full_name, username, created_at },
 *   settings: user_settings satırı | null,
 *   subscription: en güncel subscriptions satırı | null,
 *   payments: billing_payment_history satırları (en yeni 100),
 *   qrcodes: kullanıcıya ait tüm qr_codes satırları,
 *   scans: kullanıcının QR'larına ait scan_logs satırları (ilk 50.000),
 *   bookings: kullanıcının QR'larına gelen booking_submissions satırları,
 *   feedback: kullanıcının QR'larına gelen feedback_submissions satırları,
 *   menu_orders: menü tipi QR'lardaki dynamic_content.orders dizilerinden derlenen sipariş listesi
 * }
 */
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const sb = sbAdmin();
  const [userResult, profileResult, settingsResult, subscriptionResult, paymentsResult, qrResult] = await Promise.all([
    sb.auth.admin.getUserById(auth.userId),
    sb.from("profiles").select("*").eq("user_id", auth.userId).maybeSingle(),
    sb.from("user_settings").select("*").eq("user_id", auth.userId).maybeSingle(),
    sb.from("subscriptions").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("billing_payment_history").select("*").eq("user_id", auth.userId).order("billed_at", { ascending: false }).limit(100),
    sb.from("qr_codes").select("*").eq("user_id", auth.userId),
  ]);

  if (userResult.error || !userResult.data?.user) {
    return NextResponse.json({ error: "Hesap bilgileri bulunamadı." }, { status: 404 });
  }

  const qrcodes = (qrResult.data ?? []) as Record<string, any>[];
  const qrIds = qrcodes.map(row => row.id);

  const [scansResult, bookingsResult, feedbackResult] = await Promise.all([
    qrIds.length ? sb.from("scan_logs").select("*").in("qr_id", qrIds).limit(50000) : Promise.resolve({ data: [] as any[], error: null }),
    qrIds.length ? sb.from("booking_submissions").select("*").in("qr_id", qrIds) : Promise.resolve({ data: [] as any[], error: null }),
    qrIds.length ? sb.from("feedback_submissions").select("*").in("qr_id", qrIds) : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  const menuOrders = qrcodes
    .filter(row => row.dynamic_content?.kind === "menu")
    .flatMap(row =>
      (Array.isArray(row.dynamic_content?.orders) ? row.dynamic_content.orders : []).map((order: Record<string, any>) => ({
        ...order,
        qrId: row.id,
        qrTitle: row.title,
      }))
    );

  const user = userResult.data.user;

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      full_name: profileResult.data?.full_name ?? user.user_metadata?.full_name ?? null,
      username: profileResult.data?.username ?? null,
      created_at: user.created_at,
    },
    settings: settingsResult.data ?? null,
    subscription: subscriptionResult.data ?? null,
    payments: paymentsResult.data ?? [],
    qrcodes,
    scans: scansResult.data ?? [],
    bookings: bookingsResult.data ?? [],
    feedback: feedbackResult.data ?? [],
    menu_orders: menuOrders,
  });
}

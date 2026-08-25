import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { RATE_LIMITS, checkRateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";
import { postPublicJson } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";

const ALLOWED_TRIGGERS = new Set([
  "qr_created", "qr_updated", "scan_received", "scan_milestone", "conversion_event", "anomaly_detected",
]);

async function ownedQr(userId: string, qrId: string) {
  const { data, error } = await sbAdmin().from("qr_codes").select("id,user_id").eq("id", qrId).eq("user_id", userId).maybeSingle();
  return !error && data ? data : null;
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ status: "ok", available_triggers: [...ALLOWED_TRIGGERS], version: "1.1" });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`integration:${auth.userId}`, RATE_LIMITS.INTEGRATION.max, RATE_LIMITS.INTEGRATION.windowMs)) return tooManyRequestsResponse();

  const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
  const trigger = String(payload.trigger ?? "");
  const qrId = String(payload.qr_id ?? "");
  const webhookUrl = String(payload.webhook_url ?? "").trim();
  if (!ALLOWED_TRIGGERS.has(trigger) || !qrId || !webhookUrl || webhookUrl.length > 2048) return NextResponse.json({ error: "Geçersiz webhook isteği." }, { status: 400 });
  if (!(await ownedQr(auth.userId, qrId))) return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });

  const sb = sbAdmin();
  const eventData: Record<string, unknown> = { trigger, qr_id: qrId, timestamp: new Date().toISOString() };
  if (payload.include_scan_details || trigger === "scan_received") {
    const { data } = await sb.from("scan_logs").select("device,os,country,scanned_at").eq("qr_id", qrId).order("scanned_at", { ascending: false }).limit(10);
    eventData.recent_scans = data ?? [];
  }
  if (payload.include_analytics || trigger === "scan_milestone") {
    const { data } = await sb.from("qr_codes").select("scan_count,title").eq("id", qrId).eq("user_id", auth.userId).maybeSingle();
    eventData.qr_info = data;
  }

  try {
    const response = await postPublicJson(webhookUrl, JSON.stringify(eventData));
    return NextResponse.json({ success: true, delivered: response.ok, statusCode: response.status });
  } catch {
    return NextResponse.json({ error: "Webhook hedefi güvenli değil veya yanıt vermedi." }, { status: 422 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const qrId = String(body.qr_id ?? "");
  const webhookUrl = String(body.webhook_url ?? "").trim();
  const triggers = Array.isArray(body.triggers) ? body.triggers.map(String).filter((value: string) => ALLOWED_TRIGGERS.has(value)) : ["scan_received"];
  if (!qrId || !webhookUrl || webhookUrl.length > 2048 || triggers.length === 0) return NextResponse.json({ error: "Geçersiz webhook ayarı." }, { status: 400 });
  if (!(await ownedQr(auth.userId, qrId))) return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  try {
    const parsed = new URL(webhookUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
  } catch {
    return NextResponse.json({ error: "Geçerli bir webhook URL girin." }, { status: 400 });
  }

  const { data, error } = await sbAdmin().from("webhook_subscriptions").upsert({ qr_id: qrId, user_id: auth.userId, triggers, webhook_url: webhookUrl, active: body.active ?? true }, { onConflict: "qr_id,user_id" }).select().single();
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "integrations.webhooks.PUT") }, { status: 500 });
  return NextResponse.json({ subscription: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const webhookId = req.nextUrl.searchParams.get("id") ?? "";
  if (!webhookId) return NextResponse.json({ error: "Webhook id zorunlu." }, { status: 400 });
  const { error } = await sbAdmin().from("webhook_subscriptions").delete().eq("id", webhookId).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "integrations.webhooks.DELETE") }, { status: 500 });
  return NextResponse.json({ success: true });
}

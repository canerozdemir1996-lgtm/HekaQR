import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { normalizeFeedbackConfig, type FeedbackKind, type FeedbackPriority, type FeedbackStatus } from "@/lib/feedback";

export const dynamic = "force-dynamic";

const KINDS = ["complaint", "suggestion", "request", "thanks"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["new", "reviewing", "resolved", "closed"];

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function todayRange(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const today = new Date();
  const fallbackFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  const fallbackTo = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : fallbackFrom;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : fallbackTo;
  return {
    from: Number.isNaN(+from) ? fallbackFrom : from,
    to: Number.isNaN(+to) ? fallbackTo : to,
  };
}

function summarize(rows: any[]) {
  const byStatus: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1;
    if (row.location_label) byLocation[row.location_label] = (byLocation[row.location_label] ?? 0) + 1;
  }
  return {
    total: rows.length,
    open: rows.filter(row => row.status === "new" || row.status === "reviewing").length,
    urgent: rows.filter(row => row.priority === "urgent").length,
    resolved: rows.filter(row => row.status === "resolved" || row.status === "closed").length,
    byStatus,
    byKind,
    byPriority,
    topLocations: Object.entries(byLocation).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { from, to } = todayRange(req);
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const qrId = req.nextUrl.searchParams.get("qrId") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const pageRaw = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  let query = sbAdmin()
    .from("feedback_submissions")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (status !== "all" && STATUSES.includes(status)) query = query.eq("status", status);
  if (qrId) query = query.eq("qr_id", qrId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const total = rows.length;
  const submissions = rows.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    submissions,
    summary: summarize(rows),
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
    filters: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), status, qrId: qrId || null },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  const message = String(body.message ?? "").trim().slice(0, 3000);
  const kind = KINDS.includes(String(body.kind)) ? body.kind as FeedbackKind : "suggestion";
  const priority = PRIORITIES.includes(String(body.priority)) ? body.priority as FeedbackPriority : "normal";

  if (!slug) return NextResponse.json({ error: "QR bulunamadı." }, { status: 400 });
  if (!message || message.length < 5) return NextResponse.json({ error: "Lütfen en az 5 karakterlik açıklama girin." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error } = await sb
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .eq("short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!qr || qr.is_active === false || qr.dynamic_content?.kind !== "feedback") {
    return NextResponse.json({ error: "Geri bildirim formu aktif değil." }, { status: 404 });
  }

  const config = normalizeFeedbackConfig(qr.dynamic_content);
  if (config.requireContact && !String(body.contact_email ?? body.contact_phone ?? "").trim()) {
    return NextResponse.json({ error: "İletişim bilgisi zorunlu." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || "";
  const { data: created, error: insertError } = await sb
    .from("feedback_submissions")
    .insert({
      qr_id: qr.id,
      user_id: qr.user_id,
      kind,
      priority,
      message,
      contact_name: config.allowContact ? String(body.contact_name ?? "").trim().slice(0, 120) || null : null,
      contact_email: config.allowContact ? String(body.contact_email ?? "").trim().slice(0, 160) || null : null,
      contact_phone: config.allowContact ? String(body.contact_phone ?? "").trim().slice(0, 60) || null : null,
      location_label: config.locationLabel,
      location_data: config.location,
      user_agent: userAgent,
      ip_hash: ip ? sha256(ip) : null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ submission: created, message: config.successMessage }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const { data, error } = await sbAdmin()
    .from("feedback_submissions")
    .update({ status: status as FeedbackStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}

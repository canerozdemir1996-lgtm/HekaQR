import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import {
  normalizeFeedbackConfig,
  normalizeFeedbackStatus,
  type FeedbackKind,
  type FeedbackPriority,
  type FeedbackStatus,
} from "@/lib/feedback";

export const dynamic = "force-dynamic";

const KINDS: FeedbackKind[] = ["complaint", "suggestion", "request", "thanks"];
const PRIORITIES: FeedbackPriority[] = ["low", "normal", "high", "urgent"];
const STATUSES: FeedbackStatus[] = ["new", "in_progress", "completed", "cancelled"];

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanText(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
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

function normalizeSubjectList(value: unknown, maxSelections: number) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const seen = new Set<string>();
  return raw
    .map(item => cleanText(item, 120))
    .filter(Boolean)
    .filter(item => {
      const key = item.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxSelections);
}

function summarize(rows: any[]) {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byTag: Record<string, number> = {};

  for (const row of rows) {
    const status = normalizeFeedbackStatus(row.status);
    const type = row.type ?? row.kind ?? "suggestion";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    byType[type] = (byType[type] ?? 0) + 1;
    if (row.subject) bySubject[row.subject] = (bySubject[row.subject] ?? 0) + 1;
    if (row.location_label) byLocation[row.location_label] = (byLocation[row.location_label] ?? 0) + 1;
    for (const tag of row.tags ?? []) byTag[tag] = (byTag[tag] ?? 0) + 1;
  }

  const top = (record: Record<string, number>, limit = 8) =>
    Object.entries(record)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    total: rows.length,
    open: rows.filter(row => ["new", "in_progress"].includes(normalizeFeedbackStatus(row.status))).length,
    completed: rows.filter(row => normalizeFeedbackStatus(row.status) === "completed").length,
    cancelled: rows.filter(row => normalizeFeedbackStatus(row.status) === "cancelled").length,
    byStatus,
    byType,
    topSubjects: top(bySubject),
    topLocations: top(byLocation),
    topTags: top(byTag, 12),
  };
}

async function attachQrInfo(rows: any[]) {
  const ids = Array.from(new Set(rows.map(row => row.qr_id).filter(Boolean)));
  if (ids.length === 0) return rows;
  const { data } = await sbAdmin()
    .from("qr_codes")
    .select("id,title,short_slug")
    .in("id", ids);
  const map = new Map((data ?? []).map(qr => [qr.id, qr]));
  return rows.map(row => {
    const qr = map.get(row.qr_id);
    return {
      ...row,
      status: normalizeFeedbackStatus(row.status),
      type: row.type ?? row.kind,
      qr_title: qr?.title ?? null,
      qr_slug: qr?.short_slug ?? null,
    };
  });
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { from, to } = todayRange(req);
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const tag = cleanText(req.nextUrl.searchParams.get("tag"), 80);
  const q = cleanText(req.nextUrl.searchParams.get("q"), 120).toLocaleLowerCase("tr-TR");
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

  if (status !== "all" && STATUSES.includes(status as FeedbackStatus)) query = query.eq("status", status);
  if (type !== "all" && KINDS.includes(type as FeedbackKind)) query = query.eq("type", type);
  if (qrId) query = query.eq("qr_id", qrId);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await attachQrInfo(data ?? []);
  const searched = q
    ? rows.filter(row => [
        row.message,
        row.subject,
        row.location_label,
        row.device_id,
        row.status,
        row.type,
        row.kind,
        row.qr_title,
        row.qr_slug,
        ...(row.tags ?? []),
      ].join(" ").toLocaleLowerCase("tr-TR").includes(q))
    : rows;

  const total = searched.length;
  const submissions = searched.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    submissions,
    summary: summarize(searched),
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
    filters: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), status, type, tag: tag || null, q: q || null, qrId: qrId || null },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = cleanText(body.slug, 160);
  const qrId = cleanText(body.qr_id, 160);
  const message = cleanText(body.message, 3000);
  const rawKind = cleanText(body.type ?? body.kind, 40);
  const priority = PRIORITIES.includes(cleanText(body.priority, 40) as FeedbackPriority)
    ? cleanText(body.priority, 40) as FeedbackPriority
    : "normal";

  if (!slug && !qrId) return NextResponse.json({ error: "QR bulunamadı." }, { status: 400 });

  const sb = sbAdmin();
  const lookup = sb
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,qr_type,dynamic_content");
  const { data: qr, error } = qrId
    ? await lookup.eq("id", qrId).maybeSingle()
    : await lookup.eq("short_slug", slug).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!qr || qr.is_active === false || (qr.qr_type !== "feedback" && qr.dynamic_content?.kind !== "feedback")) {
    return NextResponse.json({ error: "Geri bildirim formu aktif değil." }, { status: 404 });
  }

  const config = normalizeFeedbackConfig(qr.dynamic_content);
  if (!config.formActive) {
    return NextResponse.json({ error: "Bu form şu anda kapalı." }, { status: 403 });
  }

  const kind = KINDS.includes(rawKind as FeedbackKind)
    ? rawKind as FeedbackKind
    : config.categories[0] ?? "suggestion";
  if (!config.categories.includes(kind) && !(kind === "thanks" && config.positiveFeedbackEnabled)) {
    return NextResponse.json({ error: "Seçilen bildirim türü bu formda aktif değil." }, { status: 400 });
  }

  const selectedSubjects = normalizeSubjectList(body.subjects ?? body.subject, config.maxSelections)
    .filter(subject => {
      if (subject === config.positiveFeedbackLabel && config.positiveFeedbackEnabled) return true;
      return config.subjects.map(item => item.toLocaleLowerCase("tr-TR")).includes(subject.toLocaleLowerCase("tr-TR"));
    });
  if (config.requiredFields.subject && selectedSubjects.length === 0) {
    return NextResponse.json({ error: "Lütfen en az bir konu seçin." }, { status: 400 });
  }
  if (config.requiredFields.message && message.length < 5 && kind !== "thanks") {
    return NextResponse.json({ error: "Lütfen en az 5 karakterlik açıklama girin." }, { status: 400 });
  }

  const contactName = cleanText(body.contact_name, 120);
  const contactEmail = cleanText(body.contact_email, 160);
  const contactPhone = cleanText(body.contact_phone, 60);
  if ((config.requireContact || config.requiredFields.contact) && ![contactEmail, contactPhone].some(Boolean)) {
    return NextResponse.json({ error: "İletişim bilgisi zorunlu." }, { status: 400 });
  }

  const allowedTags = new Set(config.tags.map(item => item.toLocaleLowerCase("tr-TR")));
  const tags = normalizeSubjectList(body.tags, 12)
    .filter(tag => allowedTags.size === 0 || allowedTags.has(tag.toLocaleLowerCase("tr-TR")));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || "";

  const { data: created, error: insertError } = await sb
    .from("feedback_submissions")
    .insert({
      qr_id: qr.id,
      user_id: qr.user_id,
      type: kind,
      kind,
      priority,
      status: "new",
      subject: selectedSubjects.join(", ") || "Genel",
      tags,
      device_id: cleanText(body.device_id, 160) || null,
      location_id: config.locationLabel || null,
      message: message || selectedSubjects.join(", ") || config.positiveFeedbackLabel,
      contact_name: config.allowContact ? contactName || null : null,
      contact_email: config.allowContact ? contactEmail || null : null,
      contact_phone: config.allowContact ? contactPhone || null : null,
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
  const id = cleanText(body.id, 80);
  const status = normalizeFeedbackStatus(body.status);
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.admin_note !== "undefined") update.admin_note = cleanText(body.admin_note, 2000) || null;
  if (status === "completed") update.completed_at = new Date().toISOString();
  if (status !== "completed") update.completed_at = null;

  const { data, error } = await sbAdmin()
    .from("feedback_submissions")
    .update(update)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}

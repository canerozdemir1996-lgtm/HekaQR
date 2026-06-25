import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authRequest, isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import {
  normalizeFeedbackConfig,
  normalizeFeedbackStatus,
  type FeedbackKind,
  type FeedbackPriority,
  type FeedbackStatus,
} from "@/lib/feedback";
import { createOwnerInAppNotification, notifyOwnerOfSubmission } from "@/lib/email/ownerNotifications";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const KINDS: FeedbackKind[] = ["complaint", "suggestion", "request", "thanks"];
const PRIORITIES: FeedbackPriority[] = ["low", "normal", "high", "urgent"];
const STATUSES: FeedbackStatus[] = ["new", "in_progress", "completed", "cancelled"];
const ACTIVE_STATUSES: FeedbackStatus[] = ["new", "in_progress"];

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

async function lookupFeedbackQr(slug: string, qrId: string) {
  const lookup = sbAdmin()
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,qr_type,dynamic_content,webhook_url");
  return qrId ? lookup.eq("id", qrId).maybeSingle() : lookup.eq("short_slug", slug).maybeSingle();
}

async function listFeedbackByPublicToken(qrId: string, publicToken: string) {
  const result = await sbAdmin()
    .from("feedback_submissions")
    .select("*")
    .eq("qr_id", qrId)
    .eq("public_token", publicToken)
    .order("created_at", { ascending: false })
    .limit(5);
  if (!result.error) return { data: result.data ?? [], error: null };
  if (isSchemaCompatError(result.error)) return { data: [], error: null };
  return { data: [], error: result.error };
}

async function insertFeedbackSubmission(payload: Record<string, unknown>) {
  const modernResult = await sbAdmin()
    .from("feedback_submissions")
    .insert(payload)
    .select()
    .single();

  if (!modernResult.error) {
    return { data: modernResult.data, error: null };
  }

  if (!isSchemaCompatError(modernResult.error)) {
    return { data: null, error: modernResult.error };
  }

  const legacyPayload = {
    qr_id: payload.qr_id,
    user_id: payload.user_id,
    status: payload.status,
    message: payload.message,
    kind: payload.kind,
    type: payload.type ?? payload.kind,
    priority: payload.priority ?? "normal",
    subject: payload.subject ?? "Genel",
    tags: payload.tags ?? [],
    device_id: payload.device_id ?? null,
    location_id: payload.location_id ?? null,
  };

  const legacyResult = await sbAdmin()
    .from("feedback_submissions")
    .insert(legacyPayload)
    .select()
    .single();

  return { data: legacyResult.data, error: legacyResult.error };
}

async function patchFeedbackSubmission(id: string, userId: string, update: Record<string, unknown>) {
  const modernResult = await sbAdmin()
    .from("feedback_submissions")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (!modernResult.error) {
    return { data: modernResult.data, error: null };
  }

  if (!isSchemaCompatError(modernResult.error)) {
    return { data: null, error: modernResult.error };
  }

  const legacyUpdate: Record<string, unknown> = {
    status: update.status,
    updated_at: update.updated_at,
  };
  if (typeof update.admin_note !== "undefined") legacyUpdate.admin_note = update.admin_note;

  const legacyResult = await sbAdmin()
    .from("feedback_submissions")
    .update(legacyUpdate)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  return { data: legacyResult.data, error: legacyResult.error };
}

export async function GET(req: NextRequest) {
  const publicMode = req.nextUrl.searchParams.get("public") === "1";
  if (publicMode) {
    const slug = cleanText(req.nextUrl.searchParams.get("slug"), 160);
    const qrId = cleanText(req.nextUrl.searchParams.get("qr_id"), 160);
    const publicToken = cleanText(req.nextUrl.searchParams.get("public_token"), 160);
    if ((!slug && !qrId) || !publicToken) return NextResponse.json({ submissions: [] });

    const { data: qr, error: qrError } = await lookupFeedbackQr(slug, qrId);
    if (qrError) return NextResponse.json({ error: safeDbErrorMessage(qrError, "feedback.PUBLIC.lookup") }, { status: 500 });
    if (!qr || qr.is_active === false || (qr.qr_type !== "feedback" && qr.dynamic_content?.kind !== "feedback")) {
      return NextResponse.json({ submissions: [] });
    }

    const tracked = await listFeedbackByPublicToken(qr.id, publicToken);
    if (tracked.error) return NextResponse.json({ error: safeDbErrorMessage(tracked.error, "feedback.PUBLIC.track") }, { status: 500 });
    return NextResponse.json({ submissions: tracked.data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

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
  if (error) {
    if (isSchemaCompatError(error)) return NextResponse.json({ submissions: [], summary: summarize([]), pagination: { page, limit, total: 0, total_pages: 1 }, compatibility: "schema_pending" });
    return NextResponse.json({ error: safeDbErrorMessage(error, "feedback.GET", "Geri bildirim kayıtları şu anda alınamadı. Lütfen yenileyip tekrar deneyin.") }, { status: 500 });
  }

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
  if (!checkRateLimit(`feedback_submit:${clientIp(req)}`, RATE_LIMITS.FEEDBACK_SUBMIT.max, RATE_LIMITS.FEEDBACK_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const slug = cleanText(body.slug, 160);
  const qrId = cleanText(body.qr_id, 160);
  const publicToken = cleanText(body.public_token, 160);
  const message = cleanText(body.message, 3000);
  const rawKind = cleanText(body.type ?? body.kind, 40);
  const priority = PRIORITIES.includes(cleanText(body.priority, 40) as FeedbackPriority)
    ? cleanText(body.priority, 40) as FeedbackPriority
    : "normal";

  if (!slug && !qrId) return NextResponse.json({ error: "QR bulunamadı." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error } = await lookupFeedbackQr(slug, qrId);

  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "feedback.POST.lookup") }, { status: 500 });
  if (!qr || qr.is_active === false || (qr.qr_type !== "feedback" && qr.dynamic_content?.kind !== "feedback")) {
    return NextResponse.json({ error: "Geri bildirim formu aktif değil." }, { status: 404 });
  }

  const config = normalizeFeedbackConfig(qr.dynamic_content);
  if (!config.formActive) {
    return NextResponse.json({ error: "Bu form şu anda kapalı." }, { status: 403 });
  }
  if (!config.formTitle.trim() || config.subjects.length === 0) {
    return NextResponse.json({ error: "Bu QR henüz yapılandırılmamış." }, { status: 409 });
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

  if (publicToken) {
    const tracked = await listFeedbackByPublicToken(qr.id, publicToken);
    const active = tracked.data.find((row) => ACTIVE_STATUSES.includes(normalizeFeedbackStatus(row.status)));
    if (active) {
      return NextResponse.json({
        error: "Bu cihazdan aktif bir bildirim var. Durumunu takip edebilir veya iptal ederek yeniden gönderebilirsiniz.",
        submission: active,
        code: "ACTIVE_FEEDBACK_EXISTS",
      }, { status: 409 });
    }
  }

  const allowedTags = new Set(config.tags.map(item => item.toLocaleLowerCase("tr-TR")));
  const tags = normalizeSubjectList(body.tags, 12)
    .filter(tagItem => allowedTags.size === 0 || allowedTags.has(tagItem.toLocaleLowerCase("tr-TR")));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || "";

  const { data: created, error: insertError } = await insertFeedbackSubmission({
    qr_id: qr.id,
    user_id: qr.user_id,
    type: kind,
    feedback_type: kind,
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
    public_token: publicToken || null,
    customer_message: "Bildiriminiz alındı. Yetkili ekip süreci güncelledikçe buradan takip edebilirsiniz.",
  });

  if (insertError) return NextResponse.json({ error: safeDbErrorMessage(insertError, "feedback.POST.insert", "Geri bildiriminiz kaydedilemedi. Lütfen tekrar deneyin.") }, { status: 500 });

  await notifyOwnerOfSubmission(sb, qr.user_id, {
    kind: "feedback",
    qrTitle: qr.title,
    type: kind,
    subject: selectedSubjects.join(", ") || "Genel",
  });
  await createOwnerInAppNotification(sb, qr.user_id, {
    kind: "feedback",
    qrTitle: qr.title,
    type: kind,
    subject: selectedSubjects.join(", ") || "Genel",
  });

  await dispatchWebhook(qr.webhook_url, {
    type: "feedback.created",
    qrId: qr.id,
    qrSlug: qr.short_slug,
    data: { type: kind, priority, subjects: selectedSubjects, message, tags, contactName, contactEmail, contactPhone },
  });

  return NextResponse.json({ submission: created, message: config.successMessage }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = cleanText(body.id, 80);
  const publicToken = cleanText(body.public_token, 160);
  const publicAction = cleanText(body.public_action, 40);

  if (publicToken && id && publicAction === "cancel") {
    const { data, error } = await sbAdmin()
      .from("feedback_submissions")
      .update({ status: "cancelled", customer_cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("public_token", publicToken)
      .in("status", ACTIVE_STATUSES)
      .select()
      .single();
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "feedback.PUBLIC.cancel", "Bildirim iptal edilemedi.") }, { status: 500 });
    return NextResponse.json({ submission: data });
  }

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = normalizeFeedbackStatus(body.status);
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.admin_note !== "undefined") update.admin_note = cleanText(body.admin_note, 2000) || null;
  if (typeof body.customer_message !== "undefined") update.customer_message = cleanText(body.customer_message, 2000) || null;
  if (status === "completed") update.completed_at = new Date().toISOString();
  if (status !== "completed") update.completed_at = null;

  const { data, error } = await patchFeedbackSubmission(id, auth.userId, update);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "feedback.PATCH", "Geri bildirim durumu güncellenemedi.") }, { status: 500 });
  return NextResponse.json({ submission: data });
}

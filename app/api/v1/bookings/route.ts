import { NextRequest, NextResponse } from "next/server";
import { authRequest, isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { normalizeBookingConfig, type BookingStatus } from "@/lib/smart-qr";
import { createOwnerInAppNotification, notifyOwnerOfSubmission } from "@/lib/email/ownerNotifications";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const STATUSES: BookingStatus[] = ["new", "in_progress", "completed", "cancelled"];
const ACTIVE_STATUSES: BookingStatus[] = ["new", "in_progress"];

type BookingRow = {
  id: string;
  qr_id: string;
  user_id: string;
  status: BookingStatus | string;
  device_id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  selected_date?: string | null;
  selected_time?: string | null;
  service?: string | null;
  message?: string | null;
  service_type?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  duration_minutes?: number | null;
  timezone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  note?: string | null;
  location_label?: string | null;
  admin_note?: string | null;
  customer_message?: string | null;
  public_token?: string | null;
  customer_cancelled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
};

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeTime(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function isDateInRange(date: string, from: string, to: string) {
  return Boolean(date && from && to && date >= from && date <= to);
}

function range(req: NextRequest) {
  const today = new Date();
  const fallbackFrom = localDateKey(today);
  const plus = new Date(today);
  plus.setDate(plus.getDate() + 30);
  return {
    from: req.nextUrl.searchParams.get("from") || fallbackFrom,
    to: req.nextUrl.searchParams.get("to") || localDateKey(plus),
  };
}

function normalizeBookingRow(row: Partial<BookingRow>) {
  return {
    ...row,
    appointment_date: row.appointment_date ?? row.selected_date ?? null,
    appointment_time: row.appointment_time ?? row.selected_time ?? null,
    customer_name: row.customer_name ?? row.name ?? "",
    customer_email: row.customer_email ?? row.email ?? null,
    customer_phone: row.customer_phone ?? row.phone ?? null,
    note: row.note ?? row.message ?? null,
    service_type: row.service_type ?? row.service ?? null,
    location_label: row.location_label ?? null,
  };
}

async function listBookings(userId: string, from: string, to: string, status: string) {
  let modernQuery = sbAdmin()
    .from("booking_submissions")
    .select("*")
    .eq("user_id", userId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (status !== "all" && STATUSES.includes(status as BookingStatus)) {
    modernQuery = modernQuery.eq("status", status);
  }

  const modernResult = await modernQuery;
  if (!modernResult.error) {
    return { data: (modernResult.data ?? []).map(normalizeBookingRow), error: null };
  }

  if (!isSchemaCompatError(modernResult.error)) {
    return { data: [], error: modernResult.error };
  }

  let legacyQuery = sbAdmin()
    .from("booking_submissions")
    .select("*")
    .eq("user_id", userId)
    .gte("selected_date", from)
    .lte("selected_date", to)
    .order("selected_date", { ascending: true })
    .order("selected_time", { ascending: true });

  if (status !== "all" && STATUSES.includes(status as BookingStatus)) {
    legacyQuery = legacyQuery.eq("status", status);
  }

  const legacyResult = await legacyQuery;
  return {
    data: (legacyResult.data ?? []).map(normalizeBookingRow),
    error: legacyResult.error,
  };
}

async function lookupBookingQr(slug: string, qrId: string) {
  const lookup = sbAdmin().from("qr_codes").select("id,user_id,title,short_slug,is_active,dynamic_content,webhook_url");
  return qrId ? lookup.eq("id", qrId).maybeSingle() : lookup.eq("short_slug", slug).maybeSingle();
}

async function listPublicBookingsForQr(qrId: string, from: string, to: string) {
  const result = await sbAdmin()
    .from("booking_submissions")
    .select("id,status,appointment_date,appointment_time,selected_date,selected_time,customer_name,name,customer_email,email,customer_phone,phone,note,message,admin_note,customer_message,public_token,created_at,updated_at,completed_at,customer_cancelled_at")
    .eq("qr_id", qrId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("created_at", { ascending: false });

  if (!result.error) return { data: (result.data ?? []).map(normalizeBookingRow), error: null };
  if (!isSchemaCompatError(result.error)) return { data: [], error: result.error };

  const legacy = await sbAdmin()
    .from("booking_submissions")
    .select("id,status,selected_date,selected_time,name,email,phone,message,admin_note,created_at,updated_at,completed_at")
    .eq("qr_id", qrId)
    .gte("selected_date", from)
    .lte("selected_date", to)
    .order("created_at", { ascending: false });

  return { data: (legacy.data ?? []).map(normalizeBookingRow), error: legacy.error };
}

async function listBookingsByPublicToken(qrId: string, publicToken: string) {
  const result = await sbAdmin()
    .from("booking_submissions")
    .select("id,status,appointment_date,appointment_time,selected_date,selected_time,customer_name,name,customer_email,email,customer_phone,phone,note,message,admin_note,customer_message,public_token,created_at,updated_at,completed_at,customer_cancelled_at")
    .eq("qr_id", qrId)
    .eq("public_token", publicToken)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!result.error) return { data: (result.data ?? []).map(normalizeBookingRow), error: null };
  if (isSchemaCompatError(result.error)) return { data: [], error: null };
  return { data: [], error: result.error };
}

async function countActiveSlot(qrId: string, appointmentDate: string, appointmentTime: string) {
  const normalizedTime = normalizeTime(appointmentTime);
  const modern = await sbAdmin()
    .from("booking_submissions")
    .select("id", { count: "exact", head: true })
    .eq("qr_id", qrId)
    .eq("appointment_date", appointmentDate)
    .eq("appointment_time", normalizedTime)
    .in("status", ACTIVE_STATUSES);

  if (!modern.error) return modern.count ?? 0;
  if (!isSchemaCompatError(modern.error)) throw modern.error;

  const legacy = await sbAdmin()
    .from("booking_submissions")
    .select("id", { count: "exact", head: true })
    .eq("qr_id", qrId)
    .eq("selected_date", appointmentDate)
    .eq("selected_time", normalizedTime)
    .in("status", ACTIVE_STATUSES);

  if (legacy.error) throw legacy.error;
  return legacy.count ?? 0;
}

async function insertBookingSubmission(payload: Record<string, unknown>) {
  const modernResult = await sbAdmin()
    .from("booking_submissions")
    .insert(payload)
    .select()
    .single();

  if (!modernResult.error) {
    return { data: normalizeBookingRow(modernResult.data ?? {}), error: null };
  }

  if (!isSchemaCompatError(modernResult.error)) {
    return { data: null, error: modernResult.error };
  }

  const legacyPayload = {
    qr_id: payload.qr_id,
    user_id: payload.user_id,
    status: payload.status,
    device_id: payload.device_id ?? null,
    name: payload.customer_name ?? payload.name ?? null,
    email: payload.customer_email ?? payload.email ?? null,
    phone: payload.customer_phone ?? payload.phone ?? null,
    selected_date: payload.appointment_date ?? payload.selected_date ?? null,
    selected_time: payload.appointment_time ?? payload.selected_time ?? null,
    service: payload.service_type ?? payload.service ?? null,
    message: payload.note ?? payload.message ?? null,
  };

  const legacyResult = await sbAdmin()
    .from("booking_submissions")
    .insert(legacyPayload)
    .select()
    .single();

  return {
    data: legacyResult.data ? normalizeBookingRow(legacyResult.data) : null,
    error: legacyResult.error,
  };
}

async function patchBookingSubmission(id: string, userId: string, update: Record<string, unknown>) {
  const modernResult = await sbAdmin()
    .from("booking_submissions")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (!modernResult.error) {
    return { data: normalizeBookingRow(modernResult.data ?? {}), error: null };
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
    .from("booking_submissions")
    .update(legacyUpdate)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  return {
    data: legacyResult.data ? normalizeBookingRow(legacyResult.data) : null,
    error: legacyResult.error,
  };
}

export async function GET(req: NextRequest) {
  const publicMode = req.nextUrl.searchParams.get("public") === "1";
  if (publicMode) {
    const slug = clean(req.nextUrl.searchParams.get("slug"), 160);
    const qrId = clean(req.nextUrl.searchParams.get("qr_id"), 160);
    const publicToken = clean(req.nextUrl.searchParams.get("public_token"), 160);
    const { from, to } = range(req);
    if (!slug && !qrId) return NextResponse.json({ error: "Rezervasyon QR bulunamadı." }, { status: 400 });

    const { data: qr, error: qrError } = await lookupBookingQr(slug, qrId);
    if (qrError) return NextResponse.json({ error: safeDbErrorMessage(qrError, "bookings.PUBLIC.lookup") }, { status: 500 });
    if (!qr || qr.is_active === false || qr.dynamic_content?.kind !== "booking") {
      return NextResponse.json({ error: "Rezervasyon formu aktif değil." }, { status: 404 });
    }

    if (publicToken) {
      const tracked = await listBookingsByPublicToken(qr.id, publicToken);
      if (tracked.error) return NextResponse.json({ error: safeDbErrorMessage(tracked.error, "bookings.PUBLIC.track") }, { status: 500 });
      return NextResponse.json({ bookings: tracked.data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const config = normalizeBookingConfig(qr.dynamic_content);
    const { data, error } = await listPublicBookingsForQr(qr.id, from, to);
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "bookings.PUBLIC.availability") }, { status: 500 });
    const availability: Record<string, Record<string, { count: number; remaining: number; disabled: boolean }>> = {};
    for (const row of data ?? []) {
      if (!ACTIVE_STATUSES.includes(row.status as BookingStatus)) continue;
      const day = String(row.appointment_date ?? "");
      const time = normalizeTime(String(row.appointment_time ?? ""));
      if (!day || !time) continue;
      availability[day] ??= {};
      const count = (availability[day][time]?.count ?? 0) + 1;
      availability[day][time] = {
        count,
        remaining: Math.max(0, config.capacity - count),
        disabled: count >= config.capacity,
      };
    }

    return NextResponse.json({ availability }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { from, to } = range(req);
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;

  const { data, error } = await listBookings(auth.userId, from, to, status);
  if (error) {
    if (isSchemaCompatError(error)) return NextResponse.json({ bookings: [], summary: { total: 0, byStatus: {} }, pagination: { page, limit, total: 0, total_pages: 1 }, compatibility: "schema_pending" });
    return NextResponse.json({ error: safeDbErrorMessage(error, "bookings.GET", "Rezervasyon kayıtları şu anda alınamadı. Lütfen yenileyip tekrar deneyin.") }, { status: 500 });
  }

  const rows = data ?? [];
  const total = rows.length;
  const bookings = rows.slice((page - 1) * limit, page * limit);
  const byStatus = rows.reduce((acc: Record<string, number>, row) => {
    const key = String(row.status ?? "new");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    bookings,
    summary: { total, byStatus },
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`booking_submit:${ip}`, RATE_LIMITS.BOOKING_SUBMIT.max, RATE_LIMITS.BOOKING_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const slug = clean(body.slug, 160);
  const qrId = clean(body.qr_id, 160);
  const publicToken = clean(body.public_token, 160);
  if (!slug && !qrId) return NextResponse.json({ error: "Rezervasyon QR bulunamadı." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error } = await lookupBookingQr(slug, qrId);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "bookings.POST.lookup") }, { status: 500 });
  if (!qr || qr.is_active === false || qr.dynamic_content?.kind !== "booking") {
    return NextResponse.json({ error: "Rezervasyon formu aktif değil." }, { status: 404 });
  }

  const config = normalizeBookingConfig(qr.dynamic_content);
  if (!config.active) return NextResponse.json({ error: "Rezervasyon alımı kapalı." }, { status: 403 });
  if (!config.dateFrom || !config.dateTo || !config.timeFrom || !config.timeTo) {
    return NextResponse.json({ error: "Bu QR henüz yapılandırılmamış." }, { status: 409 });
  }

  const appointmentDate = clean(body.appointment_date ?? body.selected_date, 20);
  const appointmentTime = normalizeTime(clean(body.appointment_time ?? body.selected_time, 20));
  const customerName = clean(body.customer_name ?? body.name, 160);
  const customerEmail = clean(body.customer_email ?? body.email, 180);
  const customerPhone = clean(body.customer_phone ?? body.phone, 80);
  const note = clean(body.note ?? body.message, 1000);
  const deviceId = clean(body.device_id, 160);

  if (!appointmentDate || !appointmentTime) return NextResponse.json({ error: "Tarih ve saat zorunlu." }, { status: 400 });
  if (appointmentDate < localDateKey()) return NextResponse.json({ error: "Geçmiş tarihe rezervasyon alınamaz." }, { status: 400 });
  if (!isDateInRange(appointmentDate, config.dateFrom, config.dateTo)) return NextResponse.json({ error: "Seçilen tarih rezervasyon aralığında değil." }, { status: 400 });
  if (!customerName) return NextResponse.json({ error: "Ad soyad zorunlu." }, { status: 400 });
  if (!customerEmail && !customerPhone) return NextResponse.json({ error: "E-posta veya telefon zorunlu." }, { status: 400 });

  if (publicToken) {
    const tracked = await listBookingsByPublicToken(qr.id, publicToken);
    const active = tracked.data.find((row) => ACTIVE_STATUSES.includes(row.status as BookingStatus));
    if (active) {
      return NextResponse.json({
        error: "Bu cihazdan aktif bir rezervasyon talebi var. İptal ederek yeniden oluşturabilirsiniz.",
        booking: active,
        code: "ACTIVE_BOOKING_EXISTS",
      }, { status: 409 });
    }
  }

  const activeSlotCount = await countActiveSlot(qr.id, appointmentDate, appointmentTime);
  if (activeSlotCount >= config.capacity) {
    return NextResponse.json({ error: "Bu saat dolu. Lütfen farklı bir saat seçin." }, { status: 409 });
  }

  const { data: created, error: insertError } = await insertBookingSubmission({
    qr_id: qr.id,
    user_id: qr.user_id,
    status: "new",
    device_id: deviceId || null,
    name: customerName,
    email: customerEmail || null,
    phone: customerPhone || null,
    selected_date: appointmentDate,
    selected_time: appointmentTime,
    service: config.serviceType || null,
    message: note || null,
    service_type: config.serviceType || null,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    duration_minutes: config.durationMinutes,
    timezone: config.timezone,
    customer_name: customerName,
    customer_email: customerEmail || null,
    customer_phone: customerPhone || null,
    note: note || null,
    location_label: config.location || config.onlineUrl || null,
    public_token: publicToken || null,
    customer_message: "Rezervasyon talebiniz alındı. İşletme süreci güncelledikçe bu ekrandan takip edebilirsiniz.",
    capacity_snapshot: config.capacity,
  });

  if (insertError) return NextResponse.json({ error: safeDbErrorMessage(insertError, "bookings.POST.insert", "Rezervasyon kaydedilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.") }, { status: 500 });

  await notifyOwnerOfSubmission(sb, qr.user_id, {
    kind: "booking",
    qrTitle: qr.title,
    customerName,
    appointmentDate,
    appointmentTime,
  });
  await createOwnerInAppNotification(sb, qr.user_id, {
    kind: "booking",
    qrTitle: qr.title,
    customerName,
    appointmentDate,
    appointmentTime,
  });

  await dispatchWebhook(qr.webhook_url, {
    type: "booking.created",
    qrId: qr.id,
    qrSlug: qr.short_slug,
    data: { customerName, customerEmail, customerPhone, appointmentDate, appointmentTime, note, serviceType: config.serviceType },
  });

  return NextResponse.json({ booking: created, message: config.successMessage }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = clean(body.id, 80);
  const publicToken = clean(body.public_token, 160);
  const publicAction = clean(body.public_action, 40);

  if (publicToken && id && publicAction === "cancel") {
    const { data, error } = await sbAdmin()
      .from("booking_submissions")
      .update({ status: "cancelled", customer_cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("public_token", publicToken)
      .in("status", ACTIVE_STATUSES)
      .select()
      .single();

    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "bookings.PUBLIC.cancel", "Rezervasyon iptal edilemedi.") }, { status: 500 });
    return NextResponse.json({ booking: normalizeBookingRow(data ?? {}) });
  }

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rawStatus = clean(body.status, 40);
  const status = (rawStatus === "approved" ? "in_progress" : rawStatus) as BookingStatus;
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
  if (typeof body.admin_note !== "undefined") update.admin_note = clean(body.admin_note, 2000) || null;
  if (typeof body.customer_message !== "undefined") update.customer_message = clean(body.customer_message, 2000) || null;

  const { data, error } = await patchBookingSubmission(id, auth.userId, update);
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "bookings.PATCH", "Rezervasyon durumu güncellenemedi.") }, { status: 500 });
  return NextResponse.json({ booking: data });
}

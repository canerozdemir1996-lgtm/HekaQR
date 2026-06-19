import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { normalizeBookingConfig, type BookingStatus } from "@/lib/smart-qr";

export const dynamic = "force-dynamic";

const STATUSES: BookingStatus[] = ["new", "approved", "completed", "cancelled"];

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function range(req: NextRequest) {
  const today = new Date();
  const fallbackFrom = today.toISOString().slice(0, 10);
  const plus = new Date(today);
  plus.setDate(plus.getDate() + 30);
  return {
    from: req.nextUrl.searchParams.get("from") || fallbackFrom,
    to: req.nextUrl.searchParams.get("to") || plus.toISOString().slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { from, to } = range(req);
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;

  let query = sbAdmin()
    .from("booking_submissions")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (status !== "all" && STATUSES.includes(status as BookingStatus)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const total = rows.length;
  const bookings = rows.slice((page - 1) * limit, page * limit);
  const byStatus = rows.reduce((acc: Record<string, number>, row: any) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    bookings,
    summary: { total, byStatus },
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = clean(body.slug, 160);
  const qrId = clean(body.qr_id, 160);
  if (!slug && !qrId) return NextResponse.json({ error: "Rezervasyon QR bulunamadı." }, { status: 400 });

  const sb = sbAdmin();
  const lookup = sb.from("qr_codes").select("id,user_id,title,short_slug,is_active,dynamic_content");
  const { data: qr, error } = qrId ? await lookup.eq("id", qrId).maybeSingle() : await lookup.eq("short_slug", slug).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!qr || qr.is_active === false || qr.dynamic_content?.kind !== "booking") {
    return NextResponse.json({ error: "Rezervasyon formu aktif değil." }, { status: 404 });
  }

  const config = normalizeBookingConfig(qr.dynamic_content);
  if (!config.active) return NextResponse.json({ error: "Rezervasyon alımı kapalı." }, { status: 403 });

  const appointmentDate = clean(body.appointment_date, 20);
  const appointmentTime = clean(body.appointment_time, 20);
  const customerName = clean(body.customer_name, 160);
  const customerEmail = clean(body.customer_email, 180);
  const customerPhone = clean(body.customer_phone, 80);
  const note = clean(body.note, 1000);

  if (!appointmentDate || !appointmentTime) return NextResponse.json({ error: "Tarih ve saat zorunlu." }, { status: 400 });
  if (!customerName) return NextResponse.json({ error: "Ad soyad zorunlu." }, { status: 400 });
  if (!customerEmail && !customerPhone) return NextResponse.json({ error: "E-posta veya telefon zorunlu." }, { status: 400 });

  const { data: created, error: insertError } = await sb
    .from("booking_submissions")
    .insert({
      qr_id: qr.id,
      user_id: qr.user_id,
      status: "new",
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
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ booking: created, message: config.successMessage }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = clean(body.id, 80);
  const status = clean(body.status, 40) as BookingStatus;
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const { data, error } = await sbAdmin()
    .from("booking_submissions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}

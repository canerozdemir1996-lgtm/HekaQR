import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authRequest, isSchemaCompatError, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanText(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`lead_submit:${clientIp(req)}`, RATE_LIMITS.LEAD_SUBMIT.max, RATE_LIMITS.LEAD_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const qrId = cleanText(body.qr_id, 160);
  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 160);
  const phone = cleanText(body.phone, 60);
  const note = cleanText(body.note, 1000);

  if (!qrId || !name) return NextResponse.json({ error: "Ad ve QR bilgisi zorunlu." }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: "E-posta veya telefon zorunlu." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error: lookupError } = await sb
    .from("qr_codes")
    .select("id,user_id,short_slug,is_active,qr_type,vcard_data,webhook_url")
    .eq("id", qrId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: safeDbErrorMessage(lookupError, "leads.POST.lookup") }, { status: 500 });
  if (!qr || qr.is_active === false || qr.qr_type !== "vcard") {
    return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  }
  const vcardData = (qr.vcard_data ?? {}) as Record<string, unknown>;
  if (!vcardData.leadCaptureEnabled) {
    return NextResponse.json({ error: "Bu kartvizit iletişim formu kabul etmiyor." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "";

  const { data: created, error: insertError } = await sb
    .from("qr_leads")
    .insert({
      qr_id: qr.id,
      user_id: qr.user_id,
      name,
      email: email || null,
      phone: phone || null,
      note: note || null,
      user_agent: userAgent,
      ip_hash: ip ? sha256(ip) : null,
    })
    .select()
    .single();

  if (insertError) {
    if (isSchemaCompatError(insertError)) {
      return NextResponse.json({ error: "Bu özellik şu anda hazırlanıyor, lütfen daha sonra tekrar deneyin." }, { status: 503 });
    }
    return NextResponse.json({ error: safeDbErrorMessage(insertError, "leads.POST.insert", "Bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.") }, { status: 500 });
  }

  await dispatchWebhook(qr.webhook_url, {
    type: "lead.created",
    qrId: qr.id,
    qrSlug: qr.short_slug,
    data: { name, email, phone, note },
  });

  return NextResponse.json({ lead: created }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qrId = req.nextUrl.searchParams.get("qrId") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const pageRaw = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  const sb = sbAdmin();
  let query = sb
    .from("qr_leads")
    .select("id,qr_id,name,email,phone,note,created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });
  if (qrId) query = query.eq("qr_id", qrId);

  const { data, error } = await query;
  if (error) {
    if (isSchemaCompatError(error)) {
      return NextResponse.json({ leads: [], pagination: { page, limit, total: 0, total_pages: 1 } });
    }
    return NextResponse.json({ error: safeDbErrorMessage(error, "leads.GET") }, { status: 500 });
  }

  const rows = data ?? [];
  const qrIds = Array.from(new Set(rows.map((row) => row.qr_id)));
  const { data: qrs } = qrIds.length
    ? await sb.from("qr_codes").select("id,title,short_slug").in("id", qrIds)
    : { data: [] };
  const qrById = new Map((qrs ?? []).map((item) => [item.id, item]));
  const withQr = rows.map((row) => ({
    ...row,
    qr_title: qrById.get(row.qr_id)?.title ?? null,
    qr_slug: qrById.get(row.qr_id)?.short_slug ?? null,
  }));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const header = ["Ad Soyad", "E-posta", "Telefon", "Not", "vCard", "Tarih"];
    const csvRows = withQr.map((row) => [
      row.name,
      row.email ?? "",
      row.phone ?? "",
      row.note ?? "",
      row.qr_title ?? "",
      new Date(row.created_at).toLocaleString("tr-TR"),
    ]);
    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    return new NextResponse("﻿" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const total = withQr.length;
  const paged = withQr.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    leads: paged,
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

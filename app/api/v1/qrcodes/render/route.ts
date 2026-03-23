import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("supabaseKey is required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = (searchParams.get("slug") ?? "").trim();
  const format = (searchParams.get("format") ?? "png").trim().toLowerCase();
  const sizeRaw = Number(searchParams.get("size") ?? "512");
  const size = clamp(Number.isFinite(sizeRaw) ? sizeRaw : 512, 128, 2048);

  if (!slug) return NextResponse.json({ error: "slug zorunlu" }, { status: 400 });
  if (format !== "png" && format !== "svg") return NextResponse.json({ error: "format sadece png|svg" }, { status: 400 });

  const supabase = getSupabase();

  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("short_slug,is_active,expires_at,scan_limit,scan_count")
    .eq("short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!qr) return NextResponse.json({ error: "QR bulunamadı" }, { status: 404 });
  if (!qr.is_active) return NextResponse.json({ error: "QR devre dışı" }, { status: 410 });
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return NextResponse.json({ error: "QR süresi doldu" }, { status: 410 });
  if (qr.scan_limit !== null && qr.scan_limit !== undefined && qr.scan_count >= qr.scan_limit) {
    return NextResponse.json({ error: "QR limit aşıldı" }, { status: 410 });
  }

  // QR içeriği bu sistemde /q/{short_slug} linkidir (dashboard’daki PNG/SVG indirme de aynı mantıkla üretir).
  const origin = req.nextUrl.origin;
  const qrPayload = `${origin}/q/${qr.short_slug}`;

  if (format === "svg") {
    const svg = await QRCode.toString(qrPayload, {
      type: "svg",
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const png = await QRCode.toBuffer(qrPayload, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(png as any, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}


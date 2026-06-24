import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { buildUnlockCookie } from "@/lib/qrPasswordGate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`qr_password:${ip}`, RATE_LIMITS.QR_SCAN.max, RATE_LIMITS.QR_SCAN.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!slug || !password) return NextResponse.json({ error: "Şifre gerekli." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error } = await sb
    .from("qr_codes")
    .select("id,user_id,password")
    .eq("short_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !qr || !qr.password) {
    return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  }

  // Aynı host-bazlı izolasyon kontrolü — bkz. lib/domains/resolveDomainOwner.ts
  const domainOwnerId = await resolveVerifiedDomainOwnerId(req.headers.get("host"), sb);
  if (domainOwnerId && qr.user_id !== domainOwnerId) {
    return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  }

  if (password !== qr.password) {
    return NextResponse.json({ error: "Şifre yanlış." }, { status: 401 });
  }

  const cookie = buildUnlockCookie(slug, qr.password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: cookie.maxAgeSeconds,
    path: "/",
  });
  return response;
}

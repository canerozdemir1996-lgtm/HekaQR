import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { buildUnlockCookie } from "@/lib/qrPasswordGate";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sha256(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

async function logQrAccess(sb: ReturnType<typeof sbAdmin>, opts: {
  qrId: string | null;
  slug: string;
  ip: string;
  userAgent: string;
  success: boolean;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from("qr_access_log").insert({
      qr_id: opts.qrId,
      slug: opts.slug,
      ip_hash: opts.ip === "unknown" ? null : sha256(opts.ip),
      user_agent: opts.userAgent.slice(0, 300),
      success: opts.success,
    });
  } catch {
    // log hatası ana akışı bozmasın
  }
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? "";

  // Slug bazlı brute-force koruması — QR_UNLOCK limiti (5 deneme/5dk)
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!slug || !password) return NextResponse.json({ error: "Şifre gerekli." }, { status: 400 });

  // Rate limit slug başına uygulanır (IP değiştirme ile atlatılamaz)
  if (!checkRateLimit(`qr_unlock:${slug}:${ip}`, RATE_LIMITS.QR_UNLOCK.max, RATE_LIMITS.QR_UNLOCK.windowMs)) {
    return tooManyRequestsResponse();
  }

  const sb = sbAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: qrRaw, error } = await (sb as any)
    .from("qr_codes")
    .select("id,user_id,password")
    .eq("short_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  const qr = qrRaw as { id: string; user_id: string; password: string | null } | null;

  if (error || !qr || !qr.password) {
    return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  }

  // Host-bazlı custom domain izolasyonu
  const domainOwnerId = await resolveVerifiedDomainOwnerId(req.headers.get("host"), sb);
  if (domainOwnerId && qr.user_id !== domainOwnerId) {
    return NextResponse.json({ error: "QR bulunamadı." }, { status: 404 });
  }

  if (password !== qr.password) {
    void logQrAccess(sb, { qrId: qr.id, slug, ip, userAgent: ua, success: false });
    return NextResponse.json({ error: "Şifre yanlış." }, { status: 401 });
  }

  void logQrAccess(sb, { qrId: qr.id, slug, ip, userAgent: ua, success: true });

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

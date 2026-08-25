import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { verifyMFASetup } from "@/lib/services/mfaService";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`mfa_setup_verify:${user.id}:${clientIp(req)}`, RATE_LIMITS.MFA_VERIFY.max, RATE_LIMITS.MFA_VERIFY.windowMs)) {
    return tooManyRequestsResponse();
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "6 haneli kodu girin." }, { status: 400 });
  }

  try {
    const verified = await verifyMFASetup(user.id, code);
    if (!verified) return NextResponse.json({ error: "Kod doğrulanamadı, lütfen tekrar deneyin." }, { status: 400 });
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Doğrulama başarısız. Lütfen önce 2FA kurulumunu başlatın." }, { status: 400 });
  }
}

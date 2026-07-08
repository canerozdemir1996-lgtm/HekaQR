import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { MFA_COOKIE_NAME, mfaCookieValueFor, mfaCookieOptions } from "@/lib/mfaCookie";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  let totpCode: string;
  try {
    const body = await req.json();
    totpCode = String(body?.totpCode ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (!totpCode) {
    return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
  }

  const sb = sbAdmin();
  const { data: mfaSettings, error: mfaError } = await sb
    .from("user_mfa_settings")
    .select("mfa_enabled, verified, totp_secret")
    .eq("user_id", userId)
    .maybeSingle();

  if (mfaError || !mfaSettings?.mfa_enabled || !mfaSettings?.verified) {
    return NextResponse.json({ error: "2FA aktif değil" }, { status: 400 });
  }

  const { validateMFACode } = await import("@/lib/services/mfaService");
  const valid = await validateMFACode(userId, totpCode);
  if (!valid) {
    return NextResponse.json({ error: "Doğrulama kodu hatalı" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(MFA_COOKIE_NAME, await mfaCookieValueFor(userId), mfaCookieOptions);
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

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

  return NextResponse.json({ success: true });
}

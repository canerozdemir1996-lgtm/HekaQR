import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { setupMFA, getMFAStatus } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getMFAStatus(user.id);
  if (existing?.mfa_enabled && existing?.verified) {
    return NextResponse.json({ error: "2FA zaten aktif." }, { status: 409 });
  }

  try {
    const { secret, qrCode, backupCodes } = await setupMFA(user.id, user.email);
    return NextResponse.json({ secret, qrCode, backupCodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MFA kurulumu başlatılamadı.";
    if (message === "MFA already setup for this user") {
      return NextResponse.json({ error: "2FA kurulumu zaten başlatılmış. Devam etmek için önce devre dışı bırakın." }, { status: 409 });
    }
    return NextResponse.json({ error: "2FA kurulumu başlatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}

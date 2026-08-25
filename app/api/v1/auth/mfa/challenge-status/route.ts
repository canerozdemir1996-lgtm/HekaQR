import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MFA_COOKIE_NAME, isMfaCookieValid, mfaSessionIdFromAccessToken } from "@/lib/mfaCookie";
import { getMFAStatus } from "@/lib/services/mfaService";

export const dynamic = "force-dynamic";

// Tells the /auth/2fa-challenge page whether this browser has already passed
// the 2FA gate for the signed-in user (mfa_verified cookie is httpOnly, so
// the client can't read it directly).
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { session } } = await supabase.auth.getSession();
  const sessionId = mfaSessionIdFromAccessToken(session?.access_token);

  const status = await getMFAStatus(user.id);
  const mfaEnabled = Boolean(status?.mfa_enabled && status?.verified);
  if (!mfaEnabled) return NextResponse.json({ completed: true });

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(MFA_COOKIE_NAME)?.value;
  return NextResponse.json({ completed: await isMfaCookieValid(cookieValue, user.id, sessionId) });
}

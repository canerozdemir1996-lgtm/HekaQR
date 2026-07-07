import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { disableMFA } from "@/lib/services/mfaService";
import { MFA_COOKIE_NAME, isMfaCookieValid } from "@/lib/mfaCookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A session with 2FA enabled but not yet challenge-verified for this
  // browser must not be able to turn 2FA off (a hijacked/leftover session
  // cookie alone shouldn't be enough to disable the account's 2FA).
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(MFA_COOKIE_NAME)?.value;
  if (!(await isMfaCookieValid(cookieValue, user.id))) {
    return NextResponse.json({ error: "2FA doğrulaması gerekli." }, { status: 403 });
  }

  try {
    await disableMFA(user.id);
    return NextResponse.json({ disabled: true });
  } catch {
    return NextResponse.json({ error: "2FA devre dışı bırakılamadı." }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";
import { MFA_COOKIE_NAME, isMfaCookieValid } from "@/lib/mfaCookie";

export default async function middleware(req: NextRequest) {
  const authUnavailableRedirect = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "auth_unavailable");
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return authUnavailableRedirect();
  }

  let session: Awaited<ReturnType<typeof updateSession>>;
  try {
    session = await updateSession(req);
  } catch (error) {
    console.error("[middleware] auth session refresh failed", {
      path: req.nextUrl.pathname,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return authUnavailableRedirect();
  }
  const { supabaseResponse, user, supabase } = session;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If the user has 2FA enabled but hasn't completed the challenge yet on
  // this browser, redirect them to the 2FA challenge page.
  const { data: mfaSettings } = await supabase
    .from("user_mfa_settings")
    .select("mfa_enabled, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const mfaEnabled = Boolean(mfaSettings?.mfa_enabled && mfaSettings?.verified);
  const mfaCookie = req.cookies.get(MFA_COOKIE_NAME)?.value;

  if (mfaEnabled && !(await isMfaCookieValid(mfaCookie, user.id)) && !req.nextUrl.pathname.startsWith("/auth/2fa-challenge")) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/2fa-challenge";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Matcher is an allow-list, not a deny-list: anything not listed here (including
// /api/webhooks/*) never runs through this auth middleware. Webhook routes must
// stay excluded — providers like Lemon Squeezy can't carry a user session/CSRF
// token, so they rely solely on their own signature verification.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/vcard-builder/:path*",
  ],
};

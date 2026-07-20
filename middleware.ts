import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase-middleware";
import { MFA_COOKIE_NAME, isMfaCookieValid } from "./lib/mfaCookie";
import { safeInternalPath } from "./lib/auth-redirect";

export default async function middleware(req: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(req);

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeInternalPath(`${req.nextUrl.pathname}${req.nextUrl.search}`));
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
    url.search = "";
    url.searchParams.set("next", safeInternalPath(`${req.nextUrl.pathname}${req.nextUrl.search}`));
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

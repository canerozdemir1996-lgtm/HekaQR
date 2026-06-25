import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    // If the user has 2FA enabled but hasn't completed the challenge yet,
    // redirect them to the 2FA challenge page (applies to OAuth logins).
    if (token && token.mfaEnabled && !token.mfaChallengeCompleted) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/2fa-challenge";
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

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

import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // Role-based admin checks are handled by the admin page and API guards.
    // Keeping middleware auth-only avoids stale JWT roles blocking valid admins.
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

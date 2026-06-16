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

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/vcard-builder/:path*",
  ],
};

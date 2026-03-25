import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin Rotası Koruması: Sadece rolü 'admin' veya 'owner' olanlar girebilir.
    // Olmayanları standart dashboard'a geri postalar.
    if (path.startsWith("/admin")) {
      if (token?.role !== "admin" && token?.role !== "owner") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Token varsa session aktiftir, yoksa giriş yapmamıştır.
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Bu middleware SADECE bu yollarda (ve alt yollarında) tetiklenir.
  // Landing page (/), login, register ve QR okutma (/q/:path*) dışarıda bırakılarak performans artırıldı.
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/vcard-builder/:path*"
  ],
};
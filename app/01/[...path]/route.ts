import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// GS1 Digital Link resolver: /01/{gtin}(/10/{lot})(/17/{expiry})(/21/{seri})
// GTIN'i taşıyan QR'ı bulup normal tarama akışına (/q/{slug}) yönlendirir;
// analitik, şifre ve süre kontrolleri orada zaten yapılıyor.
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const gtin = (path?.[0] || "").replace(/\D/g, "");

  if (!gtin) {
    return NextResponse.redirect(new URL("/404", req.url));
  }

  const sb = sbAdmin();
  const { data: qr } = await sb
    .from("qr_codes")
    .select("short_slug")
    .filter("dynamic_content->>kind", "eq", "gs1")
    .filter("dynamic_content->>gtin", "eq", gtin)
    .is("deleted_at", null)
    .maybeSingle();

  if (!qr) {
    return NextResponse.redirect(new URL("/404", req.url));
  }

  return NextResponse.redirect(new URL(`/q/${qr.short_slug}`, req.url));
}

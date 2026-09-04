import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { getRequestPublicOrigin } from "@/lib/requestPublicOrigin";

export const dynamic = "force-dynamic";

// GS1 Digital Link resolver: /01/{gtin}(/10/{lot})(/17/{expiry})(/21/{seri})
// GTIN'i taşıyan QR'ı bulup normal tarama akışına (/q/{slug}) yönlendirir;
// analitik, şifre ve süre kontrolleri orada zaten yapılıyor.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const publicOrigin = getRequestPublicOrigin(req);
  const { path } = await params;
  const gtin = (path?.[0] || "").replace(/\D/g, "");

  if (!gtin) {
    return NextResponse.redirect(new URL("/404", publicOrigin));
  }

  const sb = sbAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: qrRaw } = await (sb as any)
    .from("qr_codes")
    .select("short_slug")
    .filter("dynamic_content->>kind", "eq", "gs1")
    .filter("dynamic_content->>gtin", "eq", gtin)
    .is("deleted_at", null)
    .maybeSingle();
  const qr = qrRaw as { short_slug: string } | null;

  if (!qr) {
    return NextResponse.redirect(new URL("/404", publicOrigin));
  }

  return NextResponse.redirect(new URL(`/q/${qr.short_slug}`, publicOrigin));
}

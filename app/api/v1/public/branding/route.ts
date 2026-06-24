import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveQrBranding } from "@/lib/organizations/branding";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/public/branding?slug=<qr_short_slug>
 * Kimlik doğrulama gerektirmez (menu/booking/feedback gibi public landing
 * sayfaları için). QR bir organizasyona aitse o organizasyonun white-label
 * marka ayarlarını (brand_name/brand_logo_url/brand_primary_color, yoksa
 * organizasyonun kendi name/logo_url'üne düşer) döndürür; aksi halde
 * { branding: null } döner ve sayfa varsayılan QR Publish görünümünü kullanır.
 *
 * Yanıt şeması: { branding: { organizationId, name, logoUrl, primaryColor } | null }
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "slug zorunlu." }, { status: 400 });

  const sb = sbAdmin();
  const { data: qr, error } = await sb
    .from("qr_codes")
    .select("organization_id")
    .eq("short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Branding bilgisi alınamadı." }, { status: 500 });
  if (!qr) return NextResponse.json({ branding: null });

  const branding = await resolveQrBranding(sb, qr);
  return NextResponse.json({ branding });
}

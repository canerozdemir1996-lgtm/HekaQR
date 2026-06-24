import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationLookupClient = SupabaseClient<any, any, any, any, any>;

export type OrganizationBranding = {
  organizationId: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

/**
 * Bir organizasyonun white-label marka ayarlarını döndürür. brand_name/
 * brand_logo_url özelleştirilmemişse organizasyonun kendi name/logo_url
 * alanlarına düşer — public landing sayfaları her zaman gösterilebilir bir
 * isim/logo bulabilsin diye.
 */
export async function resolveOrganizationBranding(
  sb: OrganizationLookupClient,
  organizationId: string,
): Promise<OrganizationBranding | null> {
  const { data, error } = await sb
    .from("organizations")
    .select("id,name,logo_url,brand_name,brand_logo_url,brand_primary_color")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    organizationId: data.id,
    name: data.brand_name?.trim() || data.name,
    logoUrl: data.brand_logo_url || data.logo_url || null,
    primaryColor: data.brand_primary_color || null,
  };
}

/**
 * QR kaydının ait olduğu organizasyon varsa marka ayarlarını döndürür;
 * organization_id boşsa null döner (white-label uygulanmaz, varsayılan
 * QR Publish görünümü kullanılır).
 */
export async function resolveQrBranding(
  sb: OrganizationLookupClient,
  qr: { organization_id?: string | null },
): Promise<OrganizationBranding | null> {
  if (!qr.organization_id) return null;
  return resolveOrganizationBranding(sb, qr.organization_id);
}

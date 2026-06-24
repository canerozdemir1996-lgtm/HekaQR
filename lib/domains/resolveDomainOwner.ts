import type { SupabaseClient } from "@supabase/supabase-js";

export type DomainLookupClient = SupabaseClient<any, any, any, any, any>;

/**
 * Bir custom domain (örn. q.musteri.com) birden fazla kullanıcının paylaştığı
 * AYNI Next.js app instance'ına nginx üzerinden proxy'lendiği için, slug bazlı
 * herkese açık rotalar (/q/[slug], /menu/[slug] vb.) host kontrolü olmadan
 * herhangi bir kullanıcının QR'ını gösterebilir — bu fonksiyon o izolasyonu
 * sağlar: istek hangi doğrulanmış custom domain üzerinden geldiyse, sadece o
 * domain'in sahibine ait QR'lar gösterilebilir.
 *
 * Host, ana uygulama domain'i ise (custom_domains'te kayıtlı/doğrulanmış
 * değilse) null döner — bu durumda mevcut global (kısıtlamasız) davranış
 * korunur.
 */
export async function resolveVerifiedDomainOwnerId(
  host: string | null | undefined,
  sb: DomainLookupClient,
): Promise<string | null> {
  if (!host) return null;
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  if (!hostname) return null;

  const { data, error } = await sb
    .from("custom_domains")
    .select("user_id")
    .eq("domain", hostname)
    .eq("status", "verified")
    .maybeSingle();

  if (error || !data) return null;
  return data.user_id;
}

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { sbAdmin } from "@/lib/server/api-helpers";
import { buildNoIndexMetadata } from "@/lib/seo";
import CouponRedeemClient from "./CouponRedeemClient";

export const dynamic = "force-dynamic";

type Campaign = {
  id: string;
  title: string;
  discount: string;
  description: string | null;
  valid_until: string | null;
};

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  try {
    const { slug } = await Promise.resolve(params);
    const { data } = await sbAdmin()
      .from("qr_codes")
      .select("title,coupon_campaigns(title,discount,description)")
      .eq("short_slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    const campaign = Array.isArray(data?.coupon_campaigns) ? data.coupon_campaigns[0] : data?.coupon_campaigns;
    const title = campaign?.title || data?.title || "Kupon";
    return {
      ...buildNoIndexMetadata(`${title} · Kupon`),
      description: campaign?.description || `${campaign?.discount || "Özel"} indirim kuponunun geçerlilik bilgilerini ve koşullarını görüntüleyin.`,
    };
  } catch {
    return buildNoIndexMetadata("Kupon");
  }
}

export default async function CouponPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = await Promise.resolve(params);
  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("id,title,short_slug,is_active,qr_type,dynamic_content,user_id,coupon_campaigns(id,title,discount,description,valid_until)")
    .eq("short_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (data) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  const campaign = Array.isArray(data?.coupon_campaigns)
    ? data?.coupon_campaigns[0] as Campaign | undefined
    : data?.coupon_campaigns as Campaign | undefined;

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.qr_type !== "coupon" || !campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Kupon bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu kupon aktif değil veya kampanya ayarı eksik.</p>
        </div>
      </main>
    );
  }

  // theme kolonu migration sonrası gelir; yoksa sorgu hata verir, sessizce null geç.
  let theme: Record<string, unknown> | null = null;
  const { data: themeRow } = await sb
    .from("coupon_campaigns")
    .select("theme")
    .eq("id", campaign.id)
    .maybeSingle();
  if (themeRow && typeof themeRow.theme === "object") theme = themeRow.theme as Record<string, unknown>;

  return (
    <CouponRedeemClient
      slug={slug}
      title={campaign.title || data.title}
      discount={campaign.discount}
      description={campaign.description}
      validUntil={campaign.valid_until}
      theme={theme}
    />
  );
}

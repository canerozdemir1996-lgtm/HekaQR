import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { sbAdmin } from "@/lib/server/api-helpers";
import CouponRedeemClient from "./CouponRedeemClient";

export const dynamic = "force-dynamic";

type Campaign = {
  id: string;
  title: string;
  discount: string;
  description: string | null;
  valid_until: string | null;
};

export default async function CouponPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
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

  if (!data || data.is_active === false || data.qr_type !== "coupon" || !campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Kupon bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu kupon aktif değil veya kampanya ayarı eksik.</p>
        </div>
      </main>
    );
  }

  return (
    <CouponRedeemClient
      slug={slug}
      title={campaign.title || data.title}
      discount={campaign.discount}
      description={campaign.description}
      validUntil={campaign.valid_until}
    />
  );
}

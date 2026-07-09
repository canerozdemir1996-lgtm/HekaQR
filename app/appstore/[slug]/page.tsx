import { Download, ExternalLink, Smartphone } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { normalizeAppStoreQrConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

export const dynamic = "force-dynamic";

function detectStore(userAgent: string) {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

export default async function AppStoreQrPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("title,short_slug,is_active,dynamic_content,user_id")
    .eq("short_slug", slug)
    .maybeSingle();

  // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
  // instance'ına proxy'liyor (nginx). İstek bir müşterinin kendi doğrulanmış
  // domain'i üzerinden geldiyse, sadece o domain'in sahibine ait QR gösterilebilir.
  if (data) {
    const domainOwnerId = await resolveVerifiedDomainOwnerId((await headers()).get("host"), sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  const config = normalizeAppStoreQrConfig(data?.dynamic_content);

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.dynamic_content?.kind !== "appstore") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Uygulama QR bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu uygulama QR'ı aktif değil veya kaldırılmış.</p>
        </div>
      </main>
    );
  }

  const ua = headers().get("user-agent") ?? "";
  const store = detectStore(ua);
  if (store === "ios" && config.appStoreUrl) redirect(config.appStoreUrl);
  if (store === "android" && config.googlePlayUrl) redirect(config.googlePlayUrl);
  const defaultUrl = config.defaultUrl || config.appStoreUrl || config.googlePlayUrl;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_35%),linear-gradient(180deg,#f8fafc,#eef2ff)] px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-2xl shadow-slate-200/70">
        {config.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logoUrl} alt="" className="mx-auto h-24 w-24 rounded-3xl object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <Smartphone size={40} />
          </div>
        )}
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-600">Akıllı Mağaza QR</p>
        <h1 className="mt-2 text-3xl font-black">{config.appName || data.title}</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{config.description}</p>
        {defaultUrl ? (
          <a href={defaultUrl} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-600/20">
            <Download size={16} /> {config.ctaText}
          </a>
        ) : (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Mağaza linki henüz tanımlanmamış.</p>
        )}
        <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500">
          {config.appStoreUrl && <a href={config.appStoreUrl} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2">App Store <ExternalLink size={12}/></a>}
          {config.googlePlayUrl && <a href={config.googlePlayUrl} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2">Google Play <ExternalLink size={12}/></a>}
        </div>
      </section>
    </main>
  );
}

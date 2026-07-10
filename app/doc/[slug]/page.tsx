import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { normalizeDocumentQrConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

export const dynamic = "force-dynamic";

export default async function DocumentQrPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("title,short_slug,is_active,dynamic_content,user_id")
    .eq("short_slug", slug)
    .maybeSingle();

  if (data) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  const config = normalizeDocumentQrConfig(data?.dynamic_content);

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.dynamic_content?.kind !== "doc" || !config.documentUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Doküman bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu doküman QR'ı aktif değil veya bağlantı eksik.</p>
        </div>
      </main>
    );
  }

  if (!config.showLanding) {
    redirect(config.documentUrl);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        {config.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.coverImageUrl} alt={config.documentTitle || data.title} className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-indigo-600 to-cyan-500 text-white">
            <FileText size={54} />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Doküman QR</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{config.documentTitle || data.title}</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{config.description}</p>
          <div className="mt-5 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            <ShieldCheck size={18} className="shrink-0" />
            {config.accessNotice}
          </div>
          <a href={config.documentUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15">
            {config.buttonText} <ExternalLink size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}

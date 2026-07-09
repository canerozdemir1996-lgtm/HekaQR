import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Barcode, CalendarClock, Layers, ShieldCheck } from "lucide-react";
import { normalizeGs1QrConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

export const dynamic = "force-dynamic";

function formatExpiry(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ProductQrPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
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

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.dynamic_content?.kind !== "gs1") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Ürün bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu ürün barkodu aktif değil veya bağlantı geçersiz.</p>
        </div>
      </main>
    );
  }

  const config = normalizeGs1QrConfig(data.dynamic_content);
  const expiryLabel = config.expiryDate ? formatExpiry(config.expiryDate) : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-500 text-white">
          <Barcode size={48} />
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">GS1 Digital Link · Ürün Barkodu</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{config.productName || data.title}</h1>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Barcode size={18} className="shrink-0 text-slate-500" />
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400">GTIN</p>
                <p className="font-mono text-sm font-bold">{config.gtin}</p>
              </div>
            </div>

            {config.batchNumber && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <Layers size={18} className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-400">Parti / Lot No</p>
                  <p className="font-mono text-sm font-bold">{config.batchNumber}</p>
                </div>
              </div>
            )}

            {expiryLabel && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <CalendarClock size={18} className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-400">Son Kullanma Tarihi</p>
                  <p className="text-sm font-bold">{expiryLabel}</p>
                </div>
              </div>
            )}

            {config.serialNumber && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <ShieldCheck size={18} className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-400">Seri Numarası</p>
                  <p className="font-mono text-sm font-bold">{config.serialNumber}</p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-xs font-semibold leading-relaxed text-slate-400">
            Bu sayfa, GS1 Digital Link standardına uygun bir ürün barkodu çözümleyicisi tarafından oluşturuldu.
          </p>
        </div>
      </section>
    </main>
  );
}

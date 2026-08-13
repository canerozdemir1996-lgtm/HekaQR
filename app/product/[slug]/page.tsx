import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Barcode, CalendarClock, Layers, ShieldCheck } from "lucide-react";
import { normalizeGs1QrConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { buildNoIndexMetadata } from "@/lib/seo";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export const dynamic = "force-dynamic";

function formatExpiry(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Ürün bilgileri zaman aşımına uğradı.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const loadProductQr = cache(async (slug: string) => {
  const result = await withTimeout(
    sbAdmin()
      .from("qr_codes")
      .select("title,short_slug,is_active,dynamic_content,user_id")
      .eq("short_slug", slug)
      .maybeSingle(),
    10_000,
  );
  if (result.error) throw new Error("Ürün bilgileri şu anda alınamıyor.");
  return result.data;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> | { slug: string } }): Promise<Metadata> {
  try {
    const { slug } = await Promise.resolve(params);
    const data = await loadProductQr(slug);
    const config = normalizeGs1QrConfig(data?.dynamic_content);
    const title = config.productName || data?.title || "Ürün Bilgisi";
    return {
      ...buildNoIndexMetadata(`${title} · Ürün Bilgisi`),
      description: config.gtin ? `${title} için GS1 Digital Link ürün ve barkod bilgileri. GTIN: ${config.gtin}.` : `${title} için ürün bilgileri.`,
    };
  } catch {
    return buildNoIndexMetadata("Ürün Bilgisi");
  }
}

export default async function ProductQrPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const sb = sbAdmin();
  const data = await loadProductQr(slug);

  if (data) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.dynamic_content?.kind !== "gs1") {
    return (
      <PublicQrStatusPage
        locale="tr"
        tone="error"
        eyebrow="Ürün bağlantısı geçersiz"
        title="Ürün bulunamadı"
        description="Bu ürün barkodu kaldırılmış, hatalı yazılmış veya artık kullanılmıyor olabilir."
        ownerHint="Barkodu yeniden tarayın. Sorun devam ederse ürünün satıcısı ya da üreticisiyle iletişime geçin."
      />
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

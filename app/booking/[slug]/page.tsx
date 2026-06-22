import BookingPageClient from "./BookingPageClient";
import { normalizeBookingConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const { data } = await sbAdmin()
    .from("qr_codes")
    .select("id,title,short_slug,is_active,dynamic_content")
    .eq("short_slug", slug)
    .maybeSingle();

  if (!data || data.is_active === false || data.dynamic_content?.kind !== "booking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Rezervasyon bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu randevu QR'ı aktif değil veya kaldırılmış.</p>
        </div>
      </main>
    );
  }

  const config = normalizeBookingConfig(data.dynamic_content);
  const configured = Boolean(config.dateFrom && config.dateTo && config.timeFrom && config.timeTo);

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Bu QR henüz yapılandırılmamış</h1>
          <p className="mt-2 text-sm text-slate-300">Rezervasyon takvimi ve saat aralığı tanımlandıktan sonra bu sayfa otomatik olarak aktifleşir.</p>
        </div>
      </main>
    );
  }

  return <BookingPageClient slug={slug} qrId={data.id} title={data.title} config={config} />;
}

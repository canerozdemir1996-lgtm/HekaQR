import FeedbackFormClient from "@/app/feedback/[slug]/FeedbackFormClient";
import { normalizeFeedbackConfig } from "@/lib/feedback";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CleanQrFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ qrId: string }> | { qrId: string };
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const { qrId } = await Promise.resolve(params);
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const deviceId = Array.isArray(query.deviceId) ? query.deviceId[0] : query.deviceId;
  const { data } = await sbAdmin()
    .from("qr_codes")
    .select("id,title,short_slug,is_active,qr_type,dynamic_content")
    .eq("id", qrId)
    .maybeSingle();

  if (!data || data.is_active === false || (data.qr_type !== "feedback" && data.dynamic_content?.kind !== "feedback")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Form bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu QR lokasyonu için aktif bildirim formu yok.</p>
        </div>
      </main>
    );
  }

  return (
    <FeedbackFormClient
      slug={data.short_slug}
      qrId={data.id}
      deviceId={deviceId}
      title={data.title}
      config={normalizeFeedbackConfig(data.dynamic_content)}
    />
  );
}

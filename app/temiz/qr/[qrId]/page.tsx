import { headers } from "next/headers";
import { notFound } from "next/navigation";
import FeedbackFormClient from "@/app/feedback/[slug]/FeedbackFormClient";
import { normalizeFeedbackConfig } from "@/lib/feedback";
import { feedbackCopy } from "@/lib/public-copy";
import { resolvePublicLocale } from "@/lib/public-locale";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

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
  const locale = resolvePublicLocale(query.lang);
  const text = feedbackCopy[locale];
  const deviceId = Array.isArray(query.deviceId) ? query.deviceId[0] : query.deviceId;

  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("id,title,short_slug,is_active,qr_type,dynamic_content,user_id")
    .eq("id", qrId)
    .maybeSingle();

  // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
  // instance'ına proxy'liyor (nginx). İstek bir müşterinin kendi doğrulanmış
  // domain'i üzerinden geldiyse, sadece o domain'in sahibine ait QR gösterilebilir.
  if (data) {
    const domainOwnerId = await resolveVerifiedDomainOwnerId((await headers()).get("host"), sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  if (!data || data.is_active === false || (data.qr_type !== "feedback" && data.dynamic_content?.kind !== "feedback")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">{text.missingTitle}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.missingBody}</p>
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
      locale={locale}
    />
  );
}

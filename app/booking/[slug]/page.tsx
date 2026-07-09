import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import BookingPageClient from "./BookingPageClient";
import { bookingCopy } from "@/lib/public-copy";
import { resolvePublicLocale } from "@/lib/public-locale";
import { normalizeBookingConfig } from "@/lib/smart-qr";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ lang?: string }> | { lang?: string };
}) {
  const { slug } = await Promise.resolve(params);
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const locale = resolvePublicLocale(query.lang);
  const text = bookingCopy[locale];

  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("id,title,short_slug,is_active,dynamic_content,user_id")
    .eq("short_slug", slug)
    .maybeSingle();

  // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
  // instance'ına proxy'liyor (nginx). İstek bir müşterinin kendi doğrulanmış
  // domain'i üzerinden geldiyse, sadece o domain'in sahibine ait QR gösterilebilir.
  if (data) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  if (data?.is_active === false) redirect("/inactive");

  if (!data || data.dynamic_content?.kind !== "booking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">{text.missingTitle}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.missingBody}</p>
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
          <h1 className="text-xl font-black">{text.unconfiguredTitle}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.unconfiguredBody}</p>
        </div>
      </main>
    );
  }

  return <BookingPageClient slug={slug} qrId={data.id} title={data.title} config={config} locale={locale} />;
}

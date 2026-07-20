import { buildNoIndexMetadata } from "@/lib/seo";
import { resolveRequestPublicLocale } from "@/lib/public-locale-server";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export const metadata = buildNoIndexMetadata("QR Tarama Limiti Doldu");

const copy = {
  tr: {
    eyebrow: "Tarama limiti doldu",
    title: "Bu QR koduna şu anda erişilemiyor",
    description: "QR kodu için belirlenen toplam tarama sınırına ulaşıldı. Telefonunuzda veya kameranızda bir sorun yok.",
    ownerHint: "İçerik sahibi tarama limitini artırabilir ya da sıfırlayabilir. Güncel erişim için QR kodunun sahibine ulaşın.",
  },
  en: {
    eyebrow: "Scan limit reached",
    title: "This QR code is currently unavailable",
    description: "This QR code has reached its configured total scan limit. There is no issue with your phone or camera.",
    ownerHint: "The content owner can increase or reset the scan limit. Contact the QR code owner for updated access.",
  },
} as const;

export default async function LimitReachedPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> | { lang?: string } }) {
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const locale = await resolveRequestPublicLocale(query.lang);
  return <PublicQrStatusPage locale={locale} tone="limit" showLocaleToggle {...copy[locale]} />;
}

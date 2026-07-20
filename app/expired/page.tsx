import { buildNoIndexMetadata } from "@/lib/seo";
import { resolveRequestPublicLocale } from "@/lib/public-locale-server";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export const metadata = buildNoIndexMetadata("QR Süresi Doldu");

const copy = {
  tr: {
    eyebrow: "Bağlantı süresi doldu",
    title: "Bu QR kodu artık geçerli değil",
    description: "İçerik sahibi bu QR kodu için bir bitiş tarihi belirlemiş ve erişim süresi sona ermiş.",
    ownerHint: "QR kodunun sahibi süreyi uzattığında aynı kod yeniden çalışabilir. Güncel bağlantı için içerik sahibiyle iletişime geçebilirsiniz.",
  },
  en: {
    eyebrow: "Link expired",
    title: "This QR code is no longer available",
    description: "The content owner set an expiry date for this QR code, and its access period has ended.",
    ownerHint: "The same QR code may work again if its owner extends the date. Contact the content owner for an updated link.",
  },
} as const;

export default async function ExpiredQrPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> | { lang?: string } }) {
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const locale = await resolveRequestPublicLocale(query.lang);
  return <PublicQrStatusPage locale={locale} tone="expired" showLocaleToggle {...copy[locale]} />;
}

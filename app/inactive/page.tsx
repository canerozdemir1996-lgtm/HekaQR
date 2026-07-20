import { buildNoIndexMetadata } from "@/lib/seo";
import { resolveRequestPublicLocale } from "@/lib/public-locale-server";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export const metadata = buildNoIndexMetadata("QR Pasif");

const copy = {
  tr: {
    eyebrow: "QR devre dışı",
    title: "Bu QR kodu geçici olarak kapalı",
    description: "İçerik sahibi bu QR kodunu devre dışı bırakmış. Kod yeniden etkinleştirildiğinde aynı bağlantı çalışmaya devam edecek.",
    ownerHint: "Güncel içerik veya alternatif bağlantı için QR kodunun bulunduğu işletme ya da içerik sahibiyle iletişime geçin.",
  },
  en: {
    eyebrow: "QR disabled",
    title: "This QR code is temporarily unavailable",
    description: "The content owner has disabled this QR code. The same link will work again if it is reactivated.",
    ownerHint: "Contact the business or content owner shown near the QR code for current content or another link.",
  },
} as const;

export default async function InactivePage({ searchParams }: { searchParams?: Promise<{ lang?: string }> | { lang?: string } }) {
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const locale = await resolveRequestPublicLocale(query.lang);
  return <PublicQrStatusPage locale={locale} tone="inactive" showLocaleToggle {...copy[locale]} />;
}

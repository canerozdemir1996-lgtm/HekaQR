import HomePageClient from "@/components/landing/HomePageClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Kod Oluşturucu | Dinamik QR, Menü ve Analiz | QR Publish",
  description:
    "Dinamik QR kod, restoran menüsü ve dijital kartvizitlerinizi QR Publish ile oluşturun, yayınlayın ve tarama performansını takip edin.",
  path: "/",
  alternateLanguages: {
    "tr-TR": "/",
    "en-US": "/en",
    "x-default": "/",
  },
});

export default function HomePage() {
  return <HomePageClient />;
}

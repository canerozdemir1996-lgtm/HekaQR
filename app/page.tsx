import HomePageClient from "@/components/landing/HomePageClient";
import { JsonLd } from "@/components/JsonLd";
import {
  buildOrganizationSchema,
  buildPageMetadata,
  buildSoftwareApplicationSchema,
  buildWebSiteSchema,
} from "@/lib/seo";

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
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            buildOrganizationSchema(),
            buildWebSiteSchema(),
            buildSoftwareApplicationSchema({
              description:
                "Dinamik QR, restoran menüsü, dijital kartvizit ve tarama analitiğini tek panelde yönetin.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
            }),
          ],
        }}
      />
      <HomePageClient />
    </>
  );
}

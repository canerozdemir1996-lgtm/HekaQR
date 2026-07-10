import PricingPageClient from "@/components/pricing/PricingPageClient";
import { JsonLd } from "@/components/JsonLd";
import { faqItems, pricingPlans } from "@/lib/pricing";
import { buildFaqPageSchema, buildPageMetadata, buildSoftwareApplicationSchema, getCanonicalUrl } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Kod Fiyatlandırma | Planları Karşılaştırın | QR Publish",
  description: "QR Publish planlarını karşılaştırın; QR kodlarınızı oluşturmak, yönetmek ve analiz etmek için ihtiyacınıza uygun paketi seçin.",
  path: "/pricing",
});

export default function PricingPage() {
  const offers = pricingPlans
    .filter((plan) => plan.price)
    .map((plan) => ({
      "@type": "Offer",
      name: plan.name.tr,
      price: String(plan.price?.monthly.TRY),
      priceCurrency: "TRY",
      url: getCanonicalUrl("/pricing"),
    }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            buildSoftwareApplicationSchema({
              description: "QR Publish planlarını karşılaştırın ve QR operasyonunuz için uygun paketi seçin.",
              offers,
            }),
            buildFaqPageSchema(faqItems.map((item) => ({ question: item.question.tr, answer: item.answer.tr }))),
          ],
        }}
      />
      <PricingPageClient />
    </>
  );
}

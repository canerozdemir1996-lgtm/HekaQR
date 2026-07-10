import PricingPageClient from "@/components/pricing/PricingPageClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Kod Fiyatlandırma | Planları Karşılaştırın | QR Publish",
  description: "QR Publish planlarını karşılaştırın; QR kodlarınızı oluşturmak, yönetmek ve analiz etmek için ihtiyacınıza uygun paketi seçin.",
  path: "/pricing",
});

export default function PricingPage() {
  return <PricingPageClient />;
}

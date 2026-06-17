import type { Metadata } from "next";
import PricingPageClient from "@/components/pricing/PricingPageClient";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "QR operasyonunuz için uygun planı seçin; aylık ve yıllık paketleri karşılaştırın.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}

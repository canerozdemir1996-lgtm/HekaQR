import type { Metadata } from "next";
import PricingCheckoutClient from "@/components/pricing/PricingCheckoutClient";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Seçilen paket için ödeme ve abonelik aktivasyon ekranı.",
  robots: { index: false, follow: false },
};

export default function PricingCheckoutPage({
  searchParams,
}: {
  searchParams?: { plan?: string; billing?: string };
}) {
  return (
    <PricingCheckoutClient
      initialPlan={searchParams?.plan}
      initialBilling={searchParams?.billing}
    />
  );
}

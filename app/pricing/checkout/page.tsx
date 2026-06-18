import type { Metadata } from "next";
import PricingCheckoutClient from "@/components/pricing/PricingCheckoutClient";

export const metadata: Metadata = {
  title: "Odeme",
  description: "Secilen paket icin odeme ve abonelik aktivasyon ekrani.",
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

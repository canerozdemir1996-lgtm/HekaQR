import PricingCheckoutClient from "@/components/pricing/PricingCheckoutClient";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Ödeme");

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

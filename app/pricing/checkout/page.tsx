import PricingCheckoutClient from "@/components/pricing/PricingCheckoutClient";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Ödeme");

export default async function PricingCheckoutPage(
  props: {
    searchParams?: Promise<{ plan?: string; billing?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <PricingCheckoutClient
      initialPlan={searchParams?.plan}
      initialBilling={searchParams?.billing}
    />
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import EnterprisePricingClient from "@/components/pricing/EnterprisePricingClient";
import { isEnterpriseSelfServeCheckoutEnabled } from "@/lib/enterprise/quote-service";

export const metadata: Metadata = {
  title: "Kurumsal Paket Hesaplayıcı",
  description: "Dinamik QR, Menü QR, ekip ve white-label ihtiyaçlarınız için tahmini enterprise paketinizi hesaplayın ve teklif gönderin.",
};

// Server-evaluated: only when self-serve checkout is live does the page switch
// from lead-form copy to payment copy. Env flag never reaches the client.
export const dynamic = "force-dynamic";

export default function EnterprisePricingPage() {
  const selfServeCheckout = isEnterpriseSelfServeCheckoutEnabled();
  return (
    <Suspense fallback={null}>
      <EnterprisePricingClient selfServeCheckout={selfServeCheckout} />
    </Suspense>
  );
}

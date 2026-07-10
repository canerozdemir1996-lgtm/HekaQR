import { Suspense } from "react";
import EnterprisePricingClient from "@/components/pricing/EnterprisePricingClient";
import { isEnterpriseSelfServeCheckoutEnabled } from "@/lib/enterprise/quote-service";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Kurumsal QR Kod Çözümleri | QR Publish",
  description: "Dinamik QR, Menü QR, ekip ve white-label ihtiyaçlarınız için kurumsal QR Publish paketini planlayın ve teklif isteyin.",
  path: "/pricing/enterprise",
});

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

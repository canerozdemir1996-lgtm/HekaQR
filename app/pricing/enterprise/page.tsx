import { Suspense } from "react";
import type { Metadata } from "next";
import EnterprisePricingClient from "@/components/pricing/EnterprisePricingClient";

export const metadata: Metadata = {
  title: "Kurumsal Paket Hesaplayıcı",
  description: "Dinamik QR, Menü QR, ekip ve white-label ihtiyaçlarınız için tahmini enterprise paketinizi hesaplayın ve teklif gönderin.",
};

export default function EnterprisePricingPage() {
  return (
    <Suspense fallback={null}>
      <EnterprisePricingClient />
    </Suspense>
  );
}

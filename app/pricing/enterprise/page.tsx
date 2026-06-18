import { Suspense } from "react";
import type { Metadata } from "next";
import EnterprisePricingClient from "@/components/pricing/EnterprisePricingClient";

export const metadata: Metadata = {
  title: "Kurumsal Paket Hesaplayici",
  description: "Dinamik QR, Menu QR, ekip ve white-label ihtiyaclari icin tahmini enterprise paketinizi hesaplayin ve teklif gonderin.",
};

export default function EnterprisePricingPage() {
  return (
    <Suspense fallback={null}>
      <EnterprisePricingClient />
    </Suspense>
  );
}

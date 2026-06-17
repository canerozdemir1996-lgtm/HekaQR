import type { Metadata } from "next";
import EnterprisePricingClient from "@/components/pricing/EnterprisePricingClient";

export const metadata: Metadata = {
  title: "Kurumsal Teklif",
  description: "Dynamic QR, Menu QR ve white-label ihtiyaçlarınız için tahmini enterprise paketi hesaplayın.",
};

export default function EnterprisePricingPage() {
  return <EnterprisePricingClient />;
}

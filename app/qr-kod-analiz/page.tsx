import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("qr-kod-analiz");

export default function QrKodAnalizPage() {
  return <SeoLandingRoute slug="qr-kod-analiz" />;
}

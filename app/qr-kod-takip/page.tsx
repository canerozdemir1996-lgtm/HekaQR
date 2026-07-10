import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("qr-kod-takip");

export default function QrKodTakipPage() {
  return <SeoLandingRoute slug="qr-kod-takip" />;
}

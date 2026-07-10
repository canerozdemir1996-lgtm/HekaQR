import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("restoran-qr-menu");

export default function RestoranQrMenuPage() {
  return <SeoLandingRoute slug="restoran-qr-menu" />;
}

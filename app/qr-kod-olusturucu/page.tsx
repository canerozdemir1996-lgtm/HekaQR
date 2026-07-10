import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("qr-kod-olusturucu");

export default function QrKodOlusturucuPage() {
  return <SeoLandingRoute slug="qr-kod-olusturucu" />;
}

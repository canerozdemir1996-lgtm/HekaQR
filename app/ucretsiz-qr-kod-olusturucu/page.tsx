import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("ucretsiz-qr-kod-olusturucu");

export default function UcretsizQrKodOlusturucuPage() {
  return <SeoLandingRoute slug="ucretsiz-qr-kod-olusturucu" />;
}

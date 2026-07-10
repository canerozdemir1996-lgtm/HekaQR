import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("dinamik-qr-kod-olusturucu");

export default function DinamikQrKodOlusturucuPage() {
  return <SeoLandingRoute slug="dinamik-qr-kod-olusturucu" />;
}

import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("whatsapp-qr-kod-olusturucu");

export default function WhatsappQrKodOlusturucuPage() {
  return <SeoLandingRoute slug="whatsapp-qr-kod-olusturucu" />;
}

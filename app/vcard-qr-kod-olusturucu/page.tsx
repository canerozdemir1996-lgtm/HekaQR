import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("vcard-qr-kod-olusturucu");

export default function VcardQrKodOlusturucuPage() {
  return <SeoLandingRoute slug="vcard-qr-kod-olusturucu" />;
}

import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("pdf-qr-kod-olusturucu");

export default function PdfQrKodOlusturucuPage() {
  return <SeoLandingRoute slug="pdf-qr-kod-olusturucu" />;
}

import { getSeoLandingMetadata, SeoLandingRoute } from "@/components/seo/SeoLandingRoute";

export const metadata = getSeoLandingMetadata("toplu-qr-kod-olusturma");

export default function TopluQrKodOlusturmaPage() {
  return <SeoLandingRoute slug="toplu-qr-kod-olusturma" />;
}

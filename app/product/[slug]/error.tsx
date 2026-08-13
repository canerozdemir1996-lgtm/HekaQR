"use client";

import { useEffect } from "react";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export default function ProductError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Product QR page failed:", error);
  }, [error]);

  return (
    <PublicQrStatusPage
      locale="tr"
      tone="error"
      eyebrow="Bağlantı kurulamadı"
      title="Ürün bilgileri yüklenemedi"
      description="Ürün bilgilerine şu anda ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyebilirsiniz."
      ownerHint="Tekrar denemenize rağmen sorun sürerse QR kodunu yeniden tarayın veya destek ekibine ulaşın."
      onRetry={reset}
    />
  );
}

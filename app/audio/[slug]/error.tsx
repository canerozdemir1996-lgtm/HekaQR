"use client";

import { useEffect } from "react";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";

export default function AudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Audio QR page failed:", error);
  }, [error]);

  return (
    <PublicQrStatusPage
      locale="tr"
      tone="error"
      eyebrow="Bağlantı kurulamadı"
      title="Ses listesi yüklenemedi"
      description="Ses içeriğine şu anda ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyebilirsiniz."
      ownerHint="Sorun devam ederse QR kodunu yeniden tarayın veya destek ekibine ulaşın."
      onRetry={reset}
    />
  );
}

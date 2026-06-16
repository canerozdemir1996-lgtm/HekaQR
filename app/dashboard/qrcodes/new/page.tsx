"use client";

import { useRouter } from "next/navigation";
import CreateQRModal from "@/components/CreateQRModal";
import type { QrCode } from "@/lib/supabase";

export default function NewQrPage() {
  const router = useRouter();

  const handleSuccess = (qr: QrCode) => {
    router.push(`/dashboard/qrcodes/${qr.id}/edit`);
  };

  return (
    <CreateQRModal
      presentation="page"
      onClose={() => router.push("/dashboard")}
      onSuccess={handleSuccess}
    />
  );
}

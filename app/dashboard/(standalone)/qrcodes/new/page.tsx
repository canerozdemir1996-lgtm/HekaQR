"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateQRModal from "@/components/CreateQRModal";
import type { QrCode } from "@/lib/supabase";

function NewQrPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") ?? undefined;

  const handleSuccess = (_qr: QrCode) => {
    router.push("/dashboard");
  };

  return (
    <CreateQRModal
      presentation="page"
      onClose={() => router.push("/dashboard")}
      onSuccess={handleSuccess}
      initialUrl={initialUrl}
    />
  );
}

export default function NewQrPage() {
  return (
    <Suspense fallback={null}>
      <NewQrPageContent />
    </Suspense>
  );
}

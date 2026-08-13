"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BulkSection } from "@/components/BulkSection";
import CreateModeTabs, { type CreateMode } from "@/components/CreateModeTabs";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import type { QrCode } from "@/lib/supabase";

function NewQrPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme] = useTheme();
  const initialUrl = searchParams.get("url") ?? undefined;
  const mode: CreateMode = searchParams.get("mode") === "bulk" ? "bulk" : "single";

  const handleSuccess = (_qr: QrCode) => {
    router.push("/dashboard");
  };

  const handleModeChange = (nextMode: CreateMode) => {
    router.push(nextMode === "bulk" ? "/dashboard/qrcodes/new?mode=bulk" : "/dashboard/qrcodes/new");
  };

  if (mode === "bulk") {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <CreateModeTabs mode="bulk" onModeChange={handleModeChange} />
          <div id="qr-create-single-panel" role="tabpanel" aria-labelledby="qr-create-mode-single" hidden />
          <section
            id="qr-create-bulk-panel"
            role="tabpanel"
            aria-labelledby="qr-create-mode-bulk"
            className="outline-none"
          >
            <BulkSection
              presentation="embedded"
              isDark={theme === "dark"}
              onBack={() => router.push("/dashboard")}
            />
          </section>
        </div>
      </main>
    );
  }

  return (
    <CreateQRModal
      presentation="page"
      onClose={() => router.push("/dashboard")}
      onSuccess={handleSuccess}
      initialUrl={initialUrl}
      onBulkCreate={() => handleModeChange("bulk")}
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

"use client";

import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard-error]", error?.message, error?.digest);
    fetch("/api/v1/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error?.message, digest: error?.digest, stack: error?.stack?.slice(0, 500) }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#030712]">
      <div className="max-w-md px-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Dashboard yüklenemedi</h2>
        <p className="mb-4 text-sm text-slate-500">{error?.message || "Bir hata oluştu."}</p>
        <button
          onClick={reset}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

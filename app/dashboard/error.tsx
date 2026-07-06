"use client";

import Link from "next/link";
import { RadioTower, RefreshCw } from "lucide-react";
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
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <RefreshCw size={16} />
            Tekrar Dene
          </button>
          <Link
            href="/status"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RadioTower size={16} />
            Go to status page
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, RadioTower } from "lucide-react";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/v1/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error?.message, digest: error?.digest, stack: error?.stack?.slice(0, 500) }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950 dark:bg-[#020617] dark:text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-200">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-black">Bir şey ters gitti</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
          Sayfa yüklenirken beklenmeyen bir sorun oluştu. Yeniden deneyebilir veya servis durumunu kontrol edebilirsiniz.
        </p>
        {error?.digest && <p className="mt-4 font-mono text-xs text-slate-400">Digest: {error.digest}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500"
          >
            <RefreshCw size={16} />
            Tekrar Dene
          </button>
          <Link
            href="/status"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RadioTower size={16} />
            Go to status page
          </Link>
        </div>
      </section>
    </main>
  );
}

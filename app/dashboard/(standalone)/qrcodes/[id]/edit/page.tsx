"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import CreateQRModal from "@/components/CreateQRModal";
import { fetchQrCode, type QrCode } from "@/lib/supabase";

export default function EditQrPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [qr, setQr] = useState<QrCode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchQrCode(params.id)
      .then(data => { if (alive) setQr(data); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "QR yüklenemedi."); });
    return () => { alive = false; };
  }, [params.id]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-500/20 dark:bg-slate-900">
          <AlertCircle className="mb-4 text-red-500" />
          <h1 className="text-xl font-black">QR düzenleme açılamadı</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
            Dashboard'a dön
          </button>
        </div>
      </main>
    );
  }

  if (!qr) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold shadow-xl dark:border-white/10 dark:bg-slate-900">
          <Loader2 className="animate-spin text-violet-500" size={18} />
          QR yükleniyor
        </div>
      </main>
    );
  }

  return (
    <CreateQRModal
      editing={qr}
      presentation="page"
      onClose={() => router.push("/dashboard")}
      onSuccess={() => router.push("/dashboard")}
    />
  );
}

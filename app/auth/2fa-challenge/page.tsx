"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, LogOut, Loader2 } from "lucide-react";

function TwoFAChallengeContent() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && session?.mfaChallengeCompleted) {
      router.replace(callbackUrl);
    }
  }, [status, session?.mfaChallengeCompleted, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/mfa/challenge-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ totpCode: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Doğrulama başarısız");
        setCode("");
        inputRef.current?.focus();
        return;
      }

      await update({ mfaChallengeCompleted: true });
      router.replace(callbackUrl);
    } catch {
      setError("Bir hata oluştu, lütfen tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && session?.mfaChallengeCompleted)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/20">
            <Shield size={28} className="text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">İki Faktörlü Doğrulama</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kimlik doğrulayıcı uygulamanızdaki 6 haneli kodu girin.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-mono font-black tracking-[0.5em] text-slate-900 placeholder-slate-300 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:placeholder-slate-600"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-center text-sm font-semibold text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Doğrula
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <LogOut size={12} />
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TwoFAChallengePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    }>
      <TwoFAChallengeContent />
    </Suspense>
  );
}

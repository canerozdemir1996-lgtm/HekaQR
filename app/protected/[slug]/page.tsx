"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Loader2, AlertCircle } from "lucide-react";

export default function ProtectedQrPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/protected-qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Şifre doğrulanamadı.");
      window.location.href = `/q/${slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre doğrulanamadı.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-sm w-full text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
          <Lock size={28} className="text-violet-300" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Şifre Korumalı İçerik</h1>
        <p className="text-slate-300 text-sm mb-6">Bu QR kodun içeriğini görüntülemek için şifreyi girin.</p>

        <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Şifre"
            autoFocus
            className="w-full h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-center text-white placeholder:text-slate-500 outline-none focus:border-violet-400"
          />

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-left text-sm font-semibold text-red-300">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            Devam Et
          </button>
        </form>
      </div>
    </div>
  );
}

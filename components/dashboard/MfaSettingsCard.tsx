"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

type Step = "idle" | "enrolling" | "confirming";

export default function MfaSettingsCard({ panelClass, subtleClass, inputClass }: { panelClass: string; subtleClass: string; inputClass: string }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedCodes, setSavedCodes] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/v1/auth/mfa/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => setEnabled(Boolean(body?.enabled)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startSetup = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/mfa/setup", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Kurulum başlatılamadı.");
      setQrCode(body.qrCode);
      setSecret(body.secret);
      setBackupCodes(body.backupCodes ?? []);
      setSavedCodes(false);
      setStep("enrolling");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kurulum başlatılamadı.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Kod doğrulanamadı.");
      setEnabled(true);
      setStep("idle");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kod doğrulanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!window.confirm("İki faktörlü doğrulamayı devre dışı bırakmak istediğinize emin misiniz? Hesabınız sadece şifre ile korunacak.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/mfa/disable", { method: "POST" });
      if (!res.ok) throw new Error("Devre dışı bırakılamadı.");
      setEnabled(false);
      setStep("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Devre dışı bırakılamadı.");
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className={`${panelClass} p-5`}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {enabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
        </div>
        <div>
          <h2 className="font-black">İki Faktörlü Doğrulama (2FA)</h2>
          <p className={`mt-1 text-sm ${subtleClass}`}>Hesabınıza şifrenize ek olarak authenticator app koduyla ekstra koruma ekleyin.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Yükleniyor...</div>
      ) : step === "idle" ? (
        enabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <ShieldCheck size={14} /> Aktif
            </span>
            <button onClick={disable} disabled={busy} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {busy ? "İşleniyor..." : "Devre Dışı Bırak"}
            </button>
          </div>
        ) : (
          <button onClick={startSetup} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-500 disabled:opacity-60">
            {busy ? "Hazırlanıyor..." : "Etkinleştir"}
          </button>
        )
      ) : step === "enrolling" ? (
        <div className="space-y-4">
          <p className={`text-sm ${subtleClass}`}>1. Authenticator uygulamanızla (Google Authenticator, Authy vb.) bu QR kodu okutun.</p>
          {qrCode && <img src={qrCode} alt="2FA QR kodu" className="h-44 w-44 rounded-xl border border-slate-200 dark:border-white/10" />}
          <p className={`text-xs ${subtleClass}`}>QR okutamıyorsanız manuel anahtar: <span className="font-mono">{secret}</span></p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Yedek Kodlar — Bir Kez Gösterilir</p>
              <button onClick={copyCodes} className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline dark:text-amber-300">
                {copied ? <Check size={12} /> : <Copy size={12} />} Kopyala
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs text-amber-800 dark:text-amber-200">
              {backupCodes.map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={savedCodes} onChange={(e) => setSavedCodes(e.target.checked)} />
            Yedek kodları güvenli bir yere kaydettim.
          </label>

          <button onClick={() => setStep("confirming")} disabled={!savedCodes} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            Devam Et
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${subtleClass}`}>2. Authenticator uygulamasındaki 6 haneli kodu girin.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={`${inputClass} max-w-[160px] text-center font-mono text-lg tracking-widest`}
          />
          <div className="flex gap-2">
            <button onClick={confirmSetup} disabled={busy || code.length !== 6} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Doğrulanıyor..." : "Onayla ve Etkinleştir"}
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); setError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

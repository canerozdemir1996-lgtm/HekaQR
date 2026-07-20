"use client";

import Link from "next/link";
import { AlertTriangle, Clock3, Gauge, Home, PauseCircle, RefreshCw, ShieldQuestion } from "lucide-react";
import PublicLocaleToggle from "@/components/public/PublicLocaleToggle";
import type { PublicLocale } from "@/lib/public-locale";

type StatusTone = "inactive" | "expired" | "limit" | "error";

const toneStyles: Record<StatusTone, { icon: typeof PauseCircle; iconClass: string; glowClass: string; eyebrowClass: string }> = {
  inactive: { icon: PauseCircle, iconClass: "text-slate-200", glowClass: "bg-slate-400/15", eyebrowClass: "text-slate-300" },
  expired: { icon: Clock3, iconClass: "text-amber-200", glowClass: "bg-amber-400/15", eyebrowClass: "text-amber-200" },
  limit: { icon: Gauge, iconClass: "text-orange-200", glowClass: "bg-orange-400/15", eyebrowClass: "text-orange-200" },
  error: { icon: AlertTriangle, iconClass: "text-rose-200", glowClass: "bg-rose-400/15", eyebrowClass: "text-rose-200" },
};

export default function PublicQrStatusPage({
  locale,
  tone,
  eyebrow,
  title,
  description,
  ownerHint,
  onRetry,
  showLocaleToggle = false,
}: {
  locale: PublicLocale;
  tone: StatusTone;
  eyebrow: string;
  title: string;
  description: string;
  ownerHint?: string;
  onRetry?: () => void;
  showLocaleToggle?: boolean;
}) {
  const styles = toneStyles[tone];
  const Icon = styles.icon;
  const labels = locale === "en"
    ? { home: "Go to home page", support: "Get support", retry: "Try again", hint: "What can I do?" }
    : { home: "Ana sayfaya dön", support: "Destek al", retry: "Tekrar dene", hint: "Ne yapabilirim?" };

  return (
    <main lang={locale} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className={`pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl ${styles.glowClass}`} />
      <section className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8" aria-labelledby="qr-status-title">
        {showLocaleToggle && (
          <div className="mb-5 flex justify-end">
            <PublicLocaleToggle initialLocale={locale} />
          </div>
        )}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07]">
          <Icon size={38} className={styles.iconClass} aria-hidden="true" />
        </div>
        <p className={`mt-6 text-xs font-black uppercase tracking-[0.2em] ${styles.eyebrowClass}`}>{eyebrow}</p>
        <h1 id="qr-status-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-7 text-slate-300">{description}</p>

        {ownerHint && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
            <ShieldQuestion size={19} className="mt-0.5 shrink-0 text-violet-300" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">{labels.hint}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-200">{ownerHint}</p>
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">
              <RefreshCw size={16} aria-hidden="true" /> {labels.retry}
            </button>
          ) : (
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">
              <Home size={16} aria-hidden="true" /> {labels.home}
            </Link>
          )}
          <Link href="/support" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">
            <AlertTriangle size={16} aria-hidden="true" /> {labels.support}
          </Link>
        </div>
        {onRetry && (
          <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 underline decoration-white/25 underline-offset-4 hover:text-white">
            <Home size={15} aria-hidden="true" /> {labels.home}
          </Link>
        )}
      </section>
    </main>
  );
}

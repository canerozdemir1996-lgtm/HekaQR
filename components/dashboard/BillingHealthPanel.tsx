"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import type { BillingHealthLevel, BillingHealthReport } from "@/lib/billing/health";

type PanelState =
  | { kind: "loading" }
  | { kind: "forbidden"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; report: BillingHealthReport };

function levelClasses(level: BillingHealthLevel) {
  if (level === "error") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }
  if (level === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function levelLabel(level: BillingHealthLevel) {
  if (level === "error") return "Kritik";
  if (level === "warn") return "Uyari";
  return "Saglikli";
}

function boolLabel(value: boolean | null) {
  if (value === null) return "-";
  return value ? "Evet" : "Hayir";
}

function formatCheckedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function BillingHealthPanel() {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/billing/health", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 403) {
        setState({ kind: "forbidden", message: typeof body?.error === "string" ? body.error : "Yetki yok." });
        return;
      }

      if (!response.ok) {
        setState({ kind: "error", message: typeof body?.error === "string" ? body.error : "Billing health alinamadi." });
        return;
      }

      setState({ kind: "ready", report: body as BillingHealthReport });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Billing health alinamadi.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const panel = "rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="font-black">Billing Health</h2>
            <p className={`mt-1 text-sm ${subtle}`}>
              Lemon Squeezy store, variant ve webhook bağlantılarını tek ekranda doğrular.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Yenile
        </button>
      </div>

      {state.kind === "loading" ? (
        <div className="mt-6 flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-violet-500" size={26} />
        </div>
      ) : null}

      {state.kind === "forbidden" ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {state.message}
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {state.message}
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${levelClasses(state.report.status)}`}>
              {state.report.status === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {levelLabel(state.report.status)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
              Mod: {state.report.mode === "test" ? "Test" : "Live"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
              Kontrol: {formatCheckedAt(state.report.checkedAt)}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>App URL</p>
              <p className="mt-2 break-all text-sm font-black text-slate-900 dark:text-white">{state.report.appUrl ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Store</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{state.report.store.name ?? state.report.store.id ?? "-"}</p>
              <p className={`mt-1 text-xs ${subtle}`}>{state.report.store.reachable ? "API erişimi doğrulandı" : state.report.store.message ?? "Store doğrulanamadı"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Webhook Secret</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{state.report.env.webhookConfigured ? "Hazır" : "Eksik"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Temel Env</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                {state.report.env.apiKeyConfigured && state.report.env.storeConfigured && state.report.env.appUrlConfigured ? "Tam" : "Eksik"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {state.report.variants.map((variant) => (
              <article key={variant.planKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{variant.planLabel}</h3>
                    <p className={`mt-1 text-xs ${subtle}`}>{variant.variantName ?? variant.variantId ?? "Variant ayari yok"}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${levelClasses(variant.status)}`}>
                    {levelLabel(variant.status)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={subtle}>Configured</p>
                    <p className="font-black text-slate-900 dark:text-white">{boolLabel(variant.configured)}</p>
                  </div>
                  <div>
                    <p className={subtle}>Reachable</p>
                    <p className="font-black text-slate-900 dark:text-white">{boolLabel(variant.reachable)}</p>
                  </div>
                  <div>
                    <p className={subtle}>Subscription</p>
                    <p className="font-black text-slate-900 dark:text-white">{boolLabel(variant.isSubscription)}</p>
                  </div>
                  <div>
                    <p className={subtle}>Mode Match</p>
                    <p className="font-black text-slate-900 dark:text-white">{boolLabel(variant.testModeMatches)}</p>
                  </div>
                  <div>
                    <p className={subtle}>Store Match</p>
                    <p className="font-black text-slate-900 dark:text-white">{boolLabel(variant.storeMatches)}</p>
                  </div>
                  <div>
                    <p className={subtle}>Durum</p>
                    <p className="font-black text-slate-900 dark:text-white">{variant.variantStatus ?? "-"}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  {variant.message ?? "Detay yok."}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Tespit edilen noktalar</h3>
            {state.report.issues.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {state.report.issues.map((issue) => (
                  <li key={issue} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-3 text-sm ${subtle}`}>Kritik bir uyumsuzluk bulunmadi.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

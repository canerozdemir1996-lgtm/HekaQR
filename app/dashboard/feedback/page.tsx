"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, RefreshCw } from "lucide-react";
import { FEEDBACK_KIND_LABEL, FEEDBACK_PRIORITY_LABEL, FEEDBACK_STATUS_LABEL, type FeedbackStatus, type FeedbackSubmission } from "@/lib/feedback";
import { useTheme } from "@/lib/theme";

type Summary = {
  total: number;
  open: number;
  urgent: number;
  resolved: number;
  topLocations: { label: string; count: number }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const EMPTY_SUMMARY: Summary = { total: 0, open: 0, urgent: 0, resolved: 0, topLocations: [] };

export default function FeedbackDashboardPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<FeedbackSubmission[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [from, setFrom] = useState(daysAgoIso(29));
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from, to, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/v1/feedback?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Geri bildirimler yüklenemedi.");
      setItems(json.submissions ?? []);
      setSummary(json.summary ?? EMPTY_SUMMARY);
      setPagination(json.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geri bildirimler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, page, status, to]);

  useEffect(() => { void load(); }, [load]);

  const dateLabel = useMemo(() => `${new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR")} - ${new Date(`${to}T00:00:00`).toLocaleDateString("tr-TR")}`, [from, to]);
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  async function updateStatus(id: string, nextStatus: FeedbackStatus) {
    const res = await fetch("/api/v1/feedback", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="min-h-screen app-bg">
      <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-6 py-3.5 backdrop-blur-2xl ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={`flex items-center gap-1.5 text-sm ${sub} transition-colors hover:text-violet-400`}>
            <ArrowLeft size={14}/> Dashboard
          </Link>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <ClipboardList size={16} className="text-rose-500" />
          <span className={`text-sm font-black ${tx}`}>Geri Bildirimler</span>
        </div>
        <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
        </button>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <section className={`rounded-2xl border ${card} p-4`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["Bugün", todayIso(), todayIso()],
              ["Son 7 Gün", daysAgoIso(6), todayIso()],
              ["Son 30 Gün", daysAgoIso(29), todayIso()],
            ].map(([label, start, end]) => (
              <button key={label} onClick={() => { setFrom(start); setTo(end); setPage(1); }} className={`rounded-xl border px-3 py-2 text-xs font-black ${from === start && to === end ? "border-violet-500 bg-violet-600 text-white" : isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className={`h-11 rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className={`h-11 rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
              <option value="all">Tüm durumlar</option>
              {Object.entries(FEEDBACK_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </section>

        <section className={`rounded-2xl border ${card} p-4`}>
          <p className={`text-xs font-black uppercase tracking-wider ${sub}`}>Rapor</p>
          <h1 className={`mt-1 text-xl font-black ${tx}`}>{dateLabel} lokasyon geri bildirim özeti</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Toplam", summary.total], ["Açık", summary.open], ["Acil", summary.urgent], ["Çözülen", summary.resolved]].map(([label, value]) => (
              <div key={label as string} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{label}</p>
                <p className={`mt-1 text-2xl font-black ${tx}`}>{value}</p>
              </div>
            ))}
          </div>
          {summary.topLocations.length > 0 && (
            <div className="mt-4 grid gap-2">
              <p className={`text-sm font-black ${tx}`}>En Çok Bildirim Gelen Lokasyonlar</p>
              {summary.topLocations.map(location => (
                <div key={location.label} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <span className={tx}>{location.label}</span>
                  <span className="font-black text-rose-500">{location.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          {items.length === 0 ? (
            <div className={`rounded-2xl border ${card} p-8 text-center ${sub}`}>{loading ? "Yükleniyor..." : "Seçili aralıkta bildirim yok."}</div>
          ) : items.map(item => (
            <article key={item.id} className={`rounded-2xl border ${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">{FEEDBACK_KIND_LABEL[item.kind]}</span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{FEEDBACK_PRIORITY_LABEL[item.priority]}</span>
                  </div>
                  <h2 className={`mt-3 text-base font-black ${tx}`}>{item.location_label || "Lokasyon yok"}</h2>
                  <p className={`mt-1 text-xs font-semibold ${sub}`}>{new Date(item.created_at).toLocaleString("tr-TR")}</p>
                </div>
                <select value={item.status} onChange={e => void updateStatus(item.id, e.target.value as FeedbackStatus)} className={`rounded-xl border px-3 py-2 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                  {Object.entries(FEEDBACK_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <p className={`mt-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed ${tx}`}>{item.message}</p>
              {(item.contact_name || item.contact_email || item.contact_phone) && (
                <p className={`mt-3 text-xs font-semibold ${sub}`}>İletişim: {[item.contact_name, item.contact_email, item.contact_phone].filter(Boolean).join(" · ")}</p>
              )}
            </article>
          ))}
        </section>

        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${card} p-3`}>
          <p className={`text-sm font-bold ${sub}`}>Sayfa {pagination.page}/{pagination.total_pages} · {pagination.total} kayıt</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><ChevronLeft size={14}/> Önceki</button>
            <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">Sonraki <ChevronRight size={14}/></button>
          </div>
        </div>
      </main>
    </div>
  );
}

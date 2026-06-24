"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Search } from "lucide-react";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_STATUS_LABEL,
  normalizeFeedbackStatus,
  type FeedbackKind,
  type FeedbackStatus,
  type FeedbackSubmission,
} from "@/lib/feedback";
import { useTheme } from "@/lib/theme";

type Summary = {
  total: number;
  open: number;
  completed: number;
  cancelled: number;
  topLocations: { label: string; count: number }[];
  topSubjects: { label: string; count: number }[];
  topTags: { label: string; count: number }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const EMPTY_SUMMARY: Summary = { total: 0, open: 0, completed: 0, cancelled: 0, topLocations: [], topSubjects: [], topTags: [] };
const TYPE_OPTIONS: Array<"all" | FeedbackKind> = ["all", "complaint", "suggestion", "request", "thanks"];

export default function FeedbackDashboardPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<FeedbackSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [from, setFrom] = useState(daysAgoIso(29));
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [type, setType] = useState<"all" | FeedbackKind>("all");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from, to, status, type, page: String(page), limit: String(limit) });
      if (search.trim()) query.set("q", search.trim());
      if (tag.trim()) query.set("tag", tag.trim());
      const res = await fetch(`/api/v1/feedback?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Geri bildirimler yüklenemedi.");
      const rows = (json.submissions ?? []) as FeedbackSubmission[];
      setItems(rows);
      setSummary(json.summary ?? EMPTY_SUMMARY);
      setPagination(json.pagination ?? { page: 1, limit, total: 0, total_pages: 1 });
      setSelectedId(prev => rows.some(item => item.id === prev) ? prev : rows[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geri bildirimler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, limit, page, search, status, tag, to, type]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onRealtime = (event: Event) => {
      if ((event as CustomEvent<{ entity?: string }>).detail?.entity === "feedback") void load();
    };
    window.addEventListener("qrpublish:dashboard-change", onRealtime);
    return () => window.removeEventListener("qrpublish:dashboard-change", onRealtime);
  }, [load]);

  const selected = useMemo(() => items.find(item => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const dateLabel = useMemo(() => `${new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR")} - ${new Date(`${to}T00:00:00`).toLocaleDateString("tr-TR")}`, [from, to]);
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  async function updateSubmission(nextStatus: FeedbackStatus, adminNote: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status: nextStatus, admin_note: adminNote }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Güncellenemedi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full">
      <header className="dashboard-card flex items-center justify-between px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <ClipboardList size={16} className="shrink-0 text-rose-500" />
          <span className={`truncate text-sm font-black ${tx}`}>Şikayet / Öneri / İstek Bildirimleri</span>
        </div>
        <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
        </button>
      </header>

      <main className="space-y-5 py-5">
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_170px_170px_120px]">
            <label className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Başlık, açıklama, konu, etiket, lokasyon ara..." className={`h-11 w-full rounded-xl border pl-9 pr-3 text-sm font-semibold ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            </label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className={`h-11 rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className={`h-11 rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
              <option value="all">Tüm durumlar</option>
              {Object.entries(FEEDBACK_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={type} onChange={e => { setType(e.target.value as typeof type); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
              {TYPE_OPTIONS.map(value => <option key={value} value={value}>{value === "all" ? "Tüm türler" : FEEDBACK_KIND_LABEL[value]}</option>)}
            </select>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
              {[20, 50, 100].map(value => <option key={value} value={value}>{value} kayıt</option>)}
            </select>
          </div>
          <div className="mt-3">
            <input value={tag} onChange={e => { setTag(e.target.value); setPage(1); }} placeholder="Etikete göre filtrele (örn: hijyen)" className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold md:max-w-sm ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
          </div>
        </section>

        <section className={`rounded-2xl border ${card} p-4`}>
          <p className={`text-xs font-black uppercase tracking-wider ${sub}`}>Rapor</p>
          <h1 className={`mt-1 text-xl font-black ${tx}`}>{dateLabel} bildirim özeti</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Toplam", summary.total], ["Açık", summary.open], ["Tamamlanan", summary.completed], ["İptal", summary.cancelled]].map(([label, value]) => (
              <div key={label as string} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{label}</p>
                <p className={`mt-1 text-2xl font-black ${tx}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              ["Lokasyon", summary.topLocations],
              ["Konu", summary.topSubjects],
              ["Etiket", summary.topTags],
            ].map(([label, rows]) => (
              <div key={label as string} className={`rounded-2xl p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-sm font-black ${tx}`}>En Çok Gelen {label as string}</p>
                <div className="mt-2 grid gap-2">
                  {(rows as Summary["topLocations"]).length === 0 ? (
                    <p className={`text-xs font-semibold ${sub}`}>Henüz veri yok.</p>
                  ) : (rows as Summary["topLocations"]).slice(0, 5).map(row => (
                    <button key={row.label} onClick={() => label === "Etiket" && setTag(row.label)} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${isDark ? "bg-slate-950/40" : "bg-white"}`}>
                      <span className={`min-w-0 truncate font-semibold ${tx}`}>{row.label}</span>
                      <span className="font-black text-rose-500">{row.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <div className={`rounded-2xl border ${card} p-8 text-center ${sub}`}>{loading ? "Yükleniyor..." : "Seçili aralıkta bildirim yok."}</div>
            ) : items.map(item => {
              const itemStatus = normalizeFeedbackStatus(item.status);
              const itemKind = (item.type ?? item.kind ?? "suggestion") as FeedbackKind;
              return (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? "border-violet-400 bg-violet-50/70 dark:border-violet-500/40 dark:bg-violet-500/10" : card}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">{FEEDBACK_KIND_LABEL[itemKind] ?? itemKind}</span>
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{FEEDBACK_STATUS_LABEL[itemStatus]}</span>
                      </div>
                      <h2 className={`mt-3 text-base font-black ${tx}`}>{item.subject || "Genel"}</h2>
                      <p className={`mt-1 line-clamp-2 text-sm font-semibold ${sub}`}>{item.message}</p>
                    </div>
                    <p className={`text-xs font-semibold ${sub}`}>{new Date(item.created_at).toLocaleString("tr-TR")}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`max-w-full rounded-lg px-2.5 py-1 text-[11px] font-bold ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{item.location_label || "Lokasyon yok"}</span>
                    {item.tags?.map(tagItem => (
                      <span key={tagItem} className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">#{tagItem}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <DetailPanel
            item={selected}
            isDark={isDark}
            card={card}
            tx={tx}
            sub={sub}
            saving={saving}
            onSave={updateSubmission}
          />
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

function DetailPanel({
  item,
  isDark,
  card,
  tx,
  sub,
  saving,
  onSave,
}: {
  item: FeedbackSubmission | null;
  isDark: boolean;
  card: string;
  tx: string;
  sub: string;
  saving: boolean;
  onSave: (status: FeedbackStatus, adminNote: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<FeedbackStatus>("new");
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus(normalizeFeedbackStatus(item?.status));
    setNote(item?.admin_note ?? "");
  }, [item]);

  if (!item) {
    return <aside className={`rounded-2xl border ${card} p-6 text-center text-sm font-semibold ${sub}`}>Detay görmek için bir bildirim seçin.</aside>;
  }

  const kind = (item.type ?? item.kind ?? "suggestion") as FeedbackKind;
  return (
    <aside className={`sticky top-20 h-fit rounded-2xl border ${card} p-5`}>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">{FEEDBACK_KIND_LABEL[kind] ?? kind}</span>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{FEEDBACK_STATUS_LABEL[status]}</span>
      </div>

      <h2 className={`mt-4 break-words text-xl font-black ${tx}`}>{item.subject || "Genel Bildirim"}</h2>
      <p className={`mt-1 text-xs font-semibold ${sub}`}>{new Date(item.created_at).toLocaleString("tr-TR")}</p>

      <div className="mt-4 grid gap-2 text-sm">
        {[
          ["QR", item.qr_title ? `${item.qr_title} (${item.qr_slug ?? ""})` : item.qr_id],
          ["Lokasyon", item.location_label || "-"],
          ["Device ID", item.device_id || "-"],
          ["Tamamlanma", item.completed_at ? new Date(item.completed_at).toLocaleString("tr-TR") : "-"],
        ].map(([label, value]) => (
          <div key={label} className={`rounded-xl p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{label}</p>
            <p className={`mt-1 break-words font-bold ${tx}`}>{value}</p>
          </div>
        ))}
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map(tag => <span key={tag} className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">#{tag}</span>)}
        </div>
      )}

      <div className={`mt-4 rounded-2xl p-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
        <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>Mesaj</p>
        <p className={`mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed ${tx}`}>{item.message}</p>
      </div>

      {(item.contact_name || item.contact_email || item.contact_phone) && (
        <div className={`mt-4 rounded-2xl p-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
          <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>İletişim</p>
          <p className={`mt-2 break-words text-sm font-semibold ${tx}`}>{[item.contact_name, item.contact_email, item.contact_phone].filter(Boolean).join(" · ")}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label>
          <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Durum</span>
          <select value={status} onChange={e => setStatus(e.target.value as FeedbackStatus)} className={`h-11 w-full rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
            {Object.entries(FEEDBACK_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Admin Notu</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-semibold ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} placeholder="Süreç notu, yapılan işlem, ekip bilgisi..." />
        </label>
        <button disabled={saving} onClick={() => void onSave(status, note)} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-50">
          {saving ? "Kaydediliyor..." : "Süreci Güncelle"}
        </button>
      </div>
    </aside>
  );
}

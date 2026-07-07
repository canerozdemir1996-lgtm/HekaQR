"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

type BookingStatus = "new" | "in_progress" | "completed" | "cancelled";
type BookingRow = {
  id: string;
  status: BookingStatus;
  service_type?: string | null;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  note?: string | null;
  location_label?: string | null;
  admin_note?: string | null;
  customer_message?: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  new: "Yeni",
  in_progress: "İnceleniyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function BookingsDashboardPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; byStatus: Record<string, number> }>({ total: 0, byStatus: {} });
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from, to, status, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/v1/bookings?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Rezervasyonlar yüklenemedi.");
      setRows(json.bookings ?? []);
      setSummary(json.summary ?? { total: 0, byStatus: {} });
      setPagination(json.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 });
    } catch (err) {
      console.error("[bookings] load error:", err);
      setError(err instanceof Error ? err.message : "Rezervasyonlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, limit, page, status, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onRealtime = (event: Event) => {
      if ((event as CustomEvent<{ entity?: string }>).detail?.entity === "booking") void load();
    };
    window.addEventListener("qrpublish:dashboard-change", onRealtime);
    return () => window.removeEventListener("qrpublish:dashboard-change", onRealtime);
  }, [load]);

  async function updateStatus(id: string, nextStatus: BookingStatus, adminNote?: string, customerMessage?: string) {
    const res = await fetch("/api/v1/bookings", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus, admin_note: adminNote, customer_message: customerMessage }),
    });
    if (res.ok) void load();
  }

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  return (
    <div className="min-h-full">
      <header className="dashboard-card flex items-center justify-between px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <CalendarCheck size={16} className="text-cyan-500" />
          <span className={`text-sm font-black ${tx}`}>Rezervasyonlar</span>
        </div>
        <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
        </button>
      </header>

      <main className="space-y-5 py-5">
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        <DashboardDateFilter
          from={from}
          to={to}
          status={status}
          limit={limit}
          statusOptions={[{ value: "all", label: "Tüm durumlar" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
          onChange={(next) => {
            if (next.from !== undefined) setFrom(next.from);
            if (next.to !== undefined) setTo(next.to);
            if (next.status !== undefined) setStatus(next.status as typeof status);
            if (next.limit !== undefined) setLimit(next.limit);
            setPage(1);
          }}
        />
        <section className={`rounded-2xl border ${card} p-4`}>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {(["new", "in_progress", "completed", "cancelled"] as BookingStatus[]).map(item => (
              <div key={item} className={`rounded-2xl p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{STATUS_LABEL[item]}</p>
                <p className={`mt-1 text-2xl font-black ${tx}`}>{summary.byStatus?.[item] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          {loading && rows.length === 0 ? (
            <div className={`flex min-h-[180px] items-center justify-center rounded-2xl border ${card} ${sub}`}>
              <RefreshCw size={20} className="animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Seçili aralıkta rezervasyon yok" description="Farklı bir tarih aralığı veya durum filtresi deneyin." />
          ) : rows.map(row => (
            <article key={row.id} className={`rounded-2xl border ${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">{row.service_type || "Rezervasyon"}</span>
                  <h2 className={`mt-3 text-lg font-black ${tx}`}>{row.customer_name}</h2>
                  <p className={`mt-1 text-sm font-semibold ${sub}`}>{new Date(`${row.appointment_date}T00:00:00`).toLocaleDateString("tr-TR")} · {row.appointment_time}</p>
                  <p className={`mt-1 text-xs font-semibold ${sub}`}>{[row.customer_email, row.customer_phone].filter(Boolean).join(" · ")}</p>
                </div>
                <select value={row.status} onChange={e => void updateStatus(row.id, e.target.value as BookingStatus, row.admin_note ?? "", row.customer_message ?? "")} className={`rounded-xl border px-3 py-2 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {(row.location_label || row.note) && <p className={`mt-3 text-sm font-semibold ${sub}`}>{row.location_label}{row.note ? ` · ${row.note}` : ""}</p>}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label>
                  <span className={`mb-1 block text-[10px] font-black uppercase tracking-wider ${sub}`}>Admin notu</span>
                  <textarea
                    defaultValue={row.admin_note ?? ""}
                    onBlur={(e) => void updateStatus(row.id, row.status, e.currentTarget.value, row.customer_message ?? "")}
                    rows={2}
                    className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-semibold ${isDark ? "border-white/10 bg-slate-950 text-white placeholder:text-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"}`}
                    placeholder="İç süreç notu..."
                  />
                </label>
                <label>
                  <span className={`mb-1 block text-[10px] font-black uppercase tracking-wider ${sub}`}>Müşteriye mesaj</span>
                  <textarea
                    defaultValue={row.customer_message ?? ""}
                    onBlur={(e) => void updateStatus(row.id, row.status, row.admin_note ?? "", e.currentTarget.value)}
                    rows={2}
                    className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-semibold ${isDark ? "border-white/10 bg-slate-950 text-white placeholder:text-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"}`}
                    placeholder="Müşterinin QR ekranında göreceği durum mesajı..."
                  />
                </label>
              </div>
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

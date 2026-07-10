"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

type BookingStatus = "new" | "in_progress" | "completed" | "cancelled";
type CalendarView = "month" | "week" | "day" | "agenda";
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
  new: "Bekliyor",
  in_progress: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal / Gelmedi",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  new: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200",
  in_progress: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200",
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

function parseDay(value: string) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(value: string, mode: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: mode === "long" ? "long" : "2-digit",
    weekday: mode === "long" ? "short" : undefined,
  }).format(parseDay(value));
}

function calendarRangeDays(from: string, to: string, max = 42) {
  const start = parseDay(from);
  const end = parseDay(to);
  const days: string[] = [];
  for (const cursor = new Date(start); cursor <= end && days.length < max; cursor.setDate(cursor.getDate() + 1)) {
    days.push(dateKey(cursor));
  }
  return days;
}

function downloadIcs(rows: BookingRow[], fileName: string) {
  const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const events = rows.map((row) => {
    const start = new Date(`${row.appointment_date}T${row.appointment_time || "09:00"}:00`);
    const end = new Date(start.getTime() + 30 * 60_000);
    const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return [
      "BEGIN:VEVENT",
      `UID:${row.id}@qrpublish`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escapeIcs(row.customer_name || row.service_type || "Rezervasyon")}`,
      `DESCRIPTION:${escapeIcs([row.service_type, row.customer_phone, row.customer_email, row.note].filter(Boolean).join(" | "))}`,
      `STATUS:${row.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");
  const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//QR Publish//Bookings//TR\r\n${events}\r\nEND:VCALENDAR`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
  const [calendarView, setCalendarView] = useState<CalendarView>("week");

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
  const calendarDays = useMemo(() => calendarRangeDays(from, to, calendarView === "month" ? 42 : calendarView === "week" ? 7 : 1), [calendarView, from, to]);
  const rowsByDate = useMemo(() => {
    return rows.reduce<Record<string, BookingRow[]>>((acc, row) => {
      const key = row.appointment_date;
      if (!key) return acc;
      acc[key] ??= [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [rows]);
  const busiestDay = useMemo(() => {
    return Object.entries(rowsByDate).sort((a, b) => b[1].length - a[1].length)[0];
  }, [rowsByDate]);
  const activeRows = rows.filter((row) => row.status === "new" || row.status === "in_progress");

  return (
    <div className="min-h-full">
      <header className="dashboard-card flex items-center justify-between px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <CalendarCheck size={16} className="text-cyan-500" />
          <span className={`text-sm font-black ${tx}`}>Rezervasyonlar</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadIcs(rows, `qrpublish-rezervasyonlar-${from}-${to}.ics`)}
            disabled={rows.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-40 ${isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}
          >
            <Download size={13} /> ICS
          </button>
          <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={`text-base font-black ${tx}`}>Operasyon özeti</h2>
              <p className={`mt-1 text-xs font-bold ${sub}`}>
                Aktif talep: {activeRows.length} · En yoğun gün: {busiestDay ? `${dayLabel(busiestDay[0], "long")} (${busiestDay[1].length})` : "-"}
              </p>
            </div>
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
              {([
                ["month", "Ay"],
                ["week", "Hafta"],
                ["day", "Gün"],
                ["agenda", "Ajanda"],
              ] as Array<[CalendarView, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCalendarView(value)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${calendarView === value ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {(["new", "in_progress", "completed", "cancelled"] as BookingStatus[]).map(item => (
              <div key={item} className={`rounded-2xl p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{STATUS_LABEL[item]}</p>
                <p className={`mt-1 text-2xl font-black ${tx}`}>{summary.byStatus?.[item] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border ${card} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className={`text-base font-black ${tx}`}>Takvim görünümü</h2>
              <p className={`mt-1 text-xs font-bold ${sub}`}>Dolu/boş saatleri ve durum renklerini tek ekranda takip edin.</p>
            </div>
          </div>

          {calendarView === "agenda" ? (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div key={`agenda-${row.id}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${STATUS_STYLE[row.status]}`}>
                  <div>
                    <p className="text-sm font-black">{row.customer_name}</p>
                    <p className="mt-1 text-xs font-bold opacity-80">{dayLabel(row.appointment_date, "long")} · {row.appointment_time} · {row.service_type || "Rezervasyon"}</p>
                  </div>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black dark:bg-slate-950/40">{STATUS_LABEL[row.status]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-3 ${calendarView === "day" ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-7"}`}>
              {calendarDays.map((day) => {
                const dayRows = rowsByDate[day] ?? [];
                return (
                  <article key={day} className={`min-h-[180px] rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className={`text-sm font-black ${tx}`}>{dayLabel(day, calendarView === "day" ? "long" : "short")}</p>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{dayRows.length ? `${dayRows.length} randevu` : "Boş"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${dayRows.length ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"}`}>
                        {dayRows.length ? "Dolu" : "Müsait"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayRows.slice(0, calendarView === "month" ? 3 : 12).map((row) => (
                        <div key={`cal-${row.id}`} className={`rounded-xl border px-3 py-2 ${STATUS_STYLE[row.status]}`}>
                          <p className="text-xs font-black">{row.appointment_time} · {row.customer_name}</p>
                          <p className="mt-0.5 truncate text-[10px] font-bold opacity-80">{row.service_type || STATUS_LABEL[row.status]}</p>
                        </div>
                      ))}
                      {dayRows.length > (calendarView === "month" ? 3 : 12) && (
                        <p className={`text-xs font-black ${sub}`}>+{dayRows.length - (calendarView === "month" ? 3 : 12)} kayıt daha</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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

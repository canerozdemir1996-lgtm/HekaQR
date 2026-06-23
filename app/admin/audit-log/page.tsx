"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSearch, Loader2, Search } from "lucide-react";
import { useTheme } from "@/lib/theme";

type AuditLogItem = {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  status: "success" | "failure";
  status_code: number | null;
  created_at: string;
  details: string;
  user_email: string | null;
  user_name: string | null;
};

type AuditLogResponse = {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AuditLogAdminPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (userFilter.trim()) params.set("user", userFilter.trim());
    if (eventFilter.trim()) params.set("event", eventFilter.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    setLoading(true);
    fetch(`/api/admin/audit-log?${params.toString()}`, { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }: { ok: boolean; body: AuditLogResponse & { error?: string } }) => {
        if (!alive || !ok) return;
        setItems(body.items ?? []);
        setTotal(body.total ?? 0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [eventFilter, from, limit, page, to, userFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);
  const panel = isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/80";
  const subtle = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark
    ? "border-white/10 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";

  return (
    <div className="space-y-5 px-6 py-8">
      <div>
        <p className={`text-xs font-black uppercase tracking-[0.22em] ${subtle}`}>Admin</p>
        <h1 className="mt-2 text-2xl font-black">Audit Log</h1>
        <p className={`mt-2 text-sm font-semibold ${subtle}`}>Kullanici, event tipi, detay ve tarih bazli kayitlari filtreleyin.</p>
      </div>

      <section className={`rounded-2xl border p-4 ${panel}`}>
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className={`mb-1.5 block text-xs font-black uppercase tracking-widest ${subtle}`}>Kullanici</span>
            <div className="relative">
              <Search size={14} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${subtle}`} />
              <input value={userFilter} onChange={(e) => { setPage(1); setUserFilter(e.target.value); }} className={`h-11 w-full rounded-xl border pl-9 pr-3 text-sm font-semibold outline-none focus:border-violet-500 ${input}`} placeholder="Ad veya e-posta" />
            </div>
          </label>
          <label className="block">
            <span className={`mb-1.5 block text-xs font-black uppercase tracking-widest ${subtle}`}>Event</span>
            <input value={eventFilter} onChange={(e) => { setPage(1); setEventFilter(e.target.value); }} className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-violet-500 ${input}`} placeholder="signin, create, qr_code..." />
          </label>
          <label className="block">
            <span className={`mb-1.5 block text-xs font-black uppercase tracking-widest ${subtle}`}>Baslangic</span>
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-violet-500 ${input}`} />
          </label>
          <label className="block">
            <span className={`mb-1.5 block text-xs font-black uppercase tracking-widest ${subtle}`}>Bitis</span>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-violet-500 ${input}`} />
          </label>
        </div>
      </section>

      <section className={`overflow-hidden rounded-2xl border ${panel}`}>
        <div className={`grid grid-cols-[1.1fr_1fr_1.5fr_150px] gap-3 border-b px-5 py-3 text-[11px] font-black uppercase tracking-widest ${subtle} ${isDark ? "border-white/10" : "border-slate-200"} hidden md:grid`}>
          <span>Kullanici</span>
          <span>Event</span>
          <span>Detay</span>
          <span>Tarih</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-violet-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
              <FileSearch size={24} />
            </div>
            <p className={`text-sm font-semibold ${subtle}`}>Filtrelere uygun audit kaydi bulunamadi.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-100"}`}>
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1fr_1.5fr_150px] md:px-5">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{item.user_name || item.user_email || "Bilinmeyen"}</p>
                  {item.user_email && <p className={`mt-1 text-xs font-semibold ${subtle}`}>{item.user_email}</p>}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{item.action}</p>
                  <p className={`mt-1 text-xs font-semibold ${subtle}`}>
                    {item.resource}
                    {item.status_code ? ` · ${item.status_code}` : ""}
                    {" · "}
                    <span className={item.status === "success" ? "text-emerald-500" : "text-red-500"}>{item.status}</span>
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-6 ${subtle}`}>{item.details || item.resource_id || "-"}</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${subtle}`}>{formatDate(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`flex items-center justify-between border-t px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <p className={`text-xs font-bold ${subtle}`}>Toplam {total} kayit</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
              Geri
            </button>
            <span className={`text-xs font-black ${subtle}`}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
              Ileri
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

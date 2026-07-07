"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Printer, RefreshCw, ShoppingBag } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/toast";
import { EmptyState } from "@/components/EmptyState";
import type { MenuOrder } from "@/lib/menu";

type OrderRow = MenuOrder & {
  qrId: string;
  qrSlug: string;
  restaurantName: string;
};

type OrderSummary = {
  currency: string;
  revenue: number;
  totalOrders: number;
  newOrders: number;
  preparingOrders: number;
  doneOrders: number;
  cancelledOrders: number;
  avgBasket: number;
  topProducts: { name: string; qty: number; total: number }[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

const STATUS: Record<MenuOrder["status"], string> = {
  new: "Yeni",
  preparing: "Hazırlanıyor",
  done: "Tamamlandı",
  cancelled: "İptal",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function monthStartIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function formatMoney(currency: string, amount: number) {
  const normalizedCurrency = (() => {
    const value = String(currency || "TRY").trim().toUpperCase();
    if (value === "TL" || value === "TRY" || value === "₺") return "TRY";
    return value.length === 3 ? value : "TRY";
  })();

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

const EMPTY_SUMMARY: OrderSummary = {
  currency: "TL",
  revenue: 0,
  totalOrders: 0,
  newOrders: 0,
  preparingOrders: 0,
  doneOrders: 0,
  cancelledOrders: 0,
  avgBasket: 0,
  topProducts: [],
};

export default function OrdersPage() {
  const toast = useToast();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<OrderSummary>(EMPTY_SUMMARY);
  const [filter, setFilter] = useState<"all" | MenuOrder["status"]>("all");
  const [from, setFrom] = useState(daysAgoIso(6));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<20 | 50 | 100>(20);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, total_pages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: filter,
      });
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const res = await fetch(`/api/v1/menu-orders?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Siparişler yüklenemedi.");
      setOrders((json.orders ?? []) as OrderRow[]);
      setSummary((json.summary ?? EMPTY_SUMMARY) as OrderSummary);
      setPagination((json.pagination ?? { page, limit, total: 0, total_pages: 1 }) as Pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Siparişler yüklenemedi.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filter, from, limit, page, to, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  const newOrderCount = summary.newOrders;
  const dateLabel = useMemo(() => {
    if (from === to) return new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR");
    return `${new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR")} - ${new Date(`${to}T00:00:00`).toLocaleDateString("tr-TR")}`;
  }, [from, to]);

  const updateStatus = async (orderId: string, status: MenuOrder["status"]) => {
    try {
      const res = await fetch("/api/v1/menu-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ orderId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Durum güncellenemedi.");
      setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status, updatedAt: json.updatedAt || new Date().toISOString() } : order));
      toast.success("Sipariş durumu güncellendi", STATUS[status]);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Durum güncellenemedi.");
    }
  };

  const setRange = (nextFrom: string, nextTo = todayIso()) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  const printReceipt = (order: OrderRow) => {
    const lines = order.items.map(item => `
      <tr><td>${item.qty} x ${item.name}</td><td style="text-align:right">${formatMoney(order.currency, item.lineTotal)}</td></tr>
    `).join("");
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Fiş</title><style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;padding:20px;color:#111}
      h1{font-size:18px;margin:0 0 4px;text-align:center}.sub{text-align:center;font-size:12px;margin-bottom:14px;color:#555}
      table{width:100%;border-collapse:collapse;font-size:13px}td{padding:6px 0;border-bottom:1px dashed #ddd}
      .total{font-size:16px;font-weight:900;text-align:right;margin-top:14px}.note{font-size:11px;margin-top:12px;color:#555}
      .legal{text-align:center;font-size:10px;margin-top:24px;color:#777}
    </style></head><body>
      <h1>${order.restaurantName}</h1>
      <div class="sub">Masa ${order.tableNo} · ${new Date(order.createdAt).toLocaleString("tr-TR")}</div>
      <table>${lines}</table>
      <div class="total">Toplam: ${formatMoney(order.currency, order.subtotal)}</div>
      ${order.note ? `<div class="note">Not: ${order.note}</div>` : ""}
      <div class="legal">Mali değeri yoktur.</div>
      <script>window.print()</script>
    </body></html>`);
    win.document.close();
  };

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  return (
    <div className="min-h-full app-bg">
      <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-6 py-3.5 backdrop-blur-2xl ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative">
              <ShoppingBag size={16} className="text-teal-400"/>
              {newOrderCount > 0 && (
                <span className="absolute -right-3 -top-3 inline-flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                  {newOrderCount > 99 ? "99+" : newOrderCount}
                </span>
              )}
            </span>
            <span className={`text-sm font-black ${tx}`}>Siparişler</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            {pagination.total} kayıt
          </span>
        </div>
        <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`} title="Yenile">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
        </button>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Siparişler açılamadı</p>
              <p className="mt-1 text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        <section className={`rounded-2xl border ${card} p-4`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["Bugün", todayIso(), todayIso()],
              ["Dün", daysAgoIso(1), daysAgoIso(1)],
              ["Son 7 Gün", daysAgoIso(6), todayIso()],
              ["Son 30 Gün", daysAgoIso(29), todayIso()],
              ["Bu Ay", monthStartIso(), todayIso()],
            ].map(([label, start, end]) => (
              <button
                key={label}
                type="button"
                onClick={() => setRange(start, end)}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                  from === start && to === end
                    ? "border-violet-500 bg-violet-600 text-white"
                    : isDark
                      ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
            <label>
              <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Başlangıç</span>
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className={`h-11 w-full rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            </label>
            <label>
              <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Bitiş</span>
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className={`h-11 w-full rounded-xl border px-3 text-sm font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} />
            </label>
            <div>
              <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Durum</span>
              <select value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                {(["all", "new", "preparing", "done", "cancelled"] as const).map(status => (
                  <option key={status} value={status}>{status === "all" ? "Tümü" : STATUS[status]}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={`mb-1 block text-xs font-black uppercase tracking-wider ${sub}`}>Liste</span>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value) as 20 | 50 | 100); setPage(1); }} className={`h-11 rounded-xl border px-3 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                <option value={20}>20 kayıt</option>
                <option value={50}>50 kayıt</option>
                <option value={100}>100 kayıt</option>
              </select>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border ${card} p-4`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-black uppercase tracking-wider ${sub}`}>Sipariş Raporları</p>
              <h2 className={`mt-1 text-lg font-black ${tx}`}>{dateLabel} operasyon özeti</h2>
            </div>
            {newOrderCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-red-500/25">
                {newOrderCount} yeni sipariş
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Ciro", formatMoney(summary.currency, summary.revenue)],
              ["Yeni", summary.newOrders],
              ["Hazırlanan", summary.preparingOrders],
              ["Tamamlanan", summary.doneOrders],
              ["Ort. Sepet", formatMoney(summary.currency, summary.avgBasket)],
            ].map(([label, value]) => (
              <div key={label as string} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>{label}</p>
                <p className={`mt-1 text-xl font-black ${tx}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>Tamamlanma Oranı</p>
              <p className={`mt-1 text-2xl font-black ${tx}`}>%{summary.totalOrders ? Math.round((summary.doneOrders / summary.totalOrders) * 100) : 0}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${summary.totalOrders ? Math.round((summary.doneOrders / summary.totalOrders) * 100) : 0}%` }} />
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>İptal Oranı</p>
              <p className={`mt-1 text-2xl font-black ${tx}`}>%{summary.totalOrders ? Math.round((summary.cancelledOrders / summary.totalOrders) * 100) : 0}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${summary.totalOrders ? Math.round((summary.cancelledOrders / summary.totalOrders) * 100) : 0}%` }} />
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>Operasyon</p>
              <p className={`mt-1 text-sm font-black ${tx}`}>{summary.newOrders + summary.preparingOrders} aktif sipariş</p>
              <p className={`mt-2 text-xs font-semibold ${sub}`}>Yeni ve hazırlanıyor durumundaki siparişler mutfak takibi için önceliklidir.</p>
            </div>
          </div>
        </section>

        {summary.topProducts.length > 0 && (
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-sm font-black ${tx}`}>En Çok Satan Ürünler</p>
            <div className="mt-3 grid gap-2">
              {summary.topProducts.slice(0, 5).map(product => (
                <div key={product.name} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <span className={tx}>{product.name}</span>
                  <span className="font-black text-teal-500">{product.qty} adet · {formatMoney(summary.currency, product.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {loading && orders.length === 0 ? (
            <div className={`flex min-h-[180px] items-center justify-center rounded-2xl border ${card} ${sub}`}>
              <RefreshCw size={20} className="animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Seçili aralıkta sipariş yok" description="Farklı bir tarih aralığı veya durum filtresi deneyin." />
          ) : orders.map(order => (
            <div key={order.id} className={`rounded-2xl border ${card} p-4 ${order.status === "new" ? "ring-2 ring-red-500/20" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-base font-black ${tx}`}>{order.restaurantName} · Masa {order.tableNo}</p>
                  <p className={`mt-1 text-xs font-semibold ${sub}`}>{new Date(order.createdAt).toLocaleString("tr-TR")} · {order.items.length} kalem</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={order.status} onChange={e => void updateStatus(order.id, e.target.value as MenuOrder["status"])} className={`rounded-xl border px-3 py-2 text-xs font-black ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                    {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button type="button" onClick={() => printReceipt(order)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                    <Printer size={13}/> Fiş
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {order.items.map(item => (
                  <div key={`${order.id}-${item.id}`} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                    <span className={tx}>{item.qty} x {item.name}</span>
                    <span className="font-black text-teal-500">{formatMoney(order.currency, item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              {order.note && <p className={`mt-3 text-sm font-semibold ${sub}`}>Not: {order.note}</p>}
              <p className={`mt-4 text-right text-lg font-black ${tx}`}>Toplam: {formatMoney(order.currency, order.subtotal)}</p>
            </div>
          ))}
        </div>

        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${card} p-3`}>
          <p className={`text-sm font-bold ${sub}`}>
            {pagination.total} kayıttan {orders.length} kayıt gösteriliyor · Sayfa {pagination.page}/{pagination.total_pages}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <ChevronLeft size={14}/> Önceki
            </button>
            <button type="button" disabled={page >= pagination.total_pages} onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              Sonraki <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

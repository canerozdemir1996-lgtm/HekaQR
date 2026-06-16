"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Printer, RefreshCw, ShoppingBag } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/toast";
import type { MenuOrder } from "@/lib/menu";

type OrderRow = MenuOrder & {
  qrId: string;
  qrSlug: string;
  restaurantName: string;
};

const STATUS: Record<MenuOrder["status"], string> = {
  new: "Yeni",
  preparing: "Hazırlanıyor",
  done: "Tamamlandı",
  cancelled: "İptal",
};

export default function OrdersPage() {
  const toast = useToast();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<"all" | MenuOrder["status"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/menu-orders", { credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Siparişler yüklenemedi.");
      setOrders((json.orders ?? []) as OrderRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Siparişler yüklenemedi.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => filter === "all" ? orders : orders.filter(order => order.status === filter), [filter, orders]);
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const paidOrders = orders.filter(order => order.status !== "cancelled");
    const revenue = (from: number) => paidOrders
      .filter(order => +new Date(order.createdAt) >= from)
      .reduce((sum, order) => sum + order.subtotal, 0);
    const productMap = new Map<string, { name: string; qty: number; total: number }>();
    paidOrders.forEach(order => order.items.forEach(item => {
      const current = productMap.get(item.id) ?? { name: item.name, qty: 0, total: 0 };
      current.qty += item.qty;
      current.total += item.lineTotal;
      productMap.set(item.id, current);
    }));
    return {
      today: revenue(startOfDay),
      week: revenue(startOfWeek),
      month: revenue(startOfMonth),
      topProducts: Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5),
      currency: orders[0]?.currency || "TL",
    };
  }, [orders]);

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
      setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status } : order));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Durum güncellenemedi.");
    }
  };

  const printReceipt = (order: OrderRow) => {
    const lines = order.items.map(item => `
      <tr><td>${item.qty} x ${item.name}</td><td style="text-align:right">${order.currency}${item.lineTotal.toFixed(2)}</td></tr>
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
      <div class="total">Toplam: ${order.currency}${order.subtotal.toFixed(2)}</div>
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
    <div className="min-h-screen app-bg">
      <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-6 py-3.5 backdrop-blur-2xl ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={`flex items-center gap-1.5 text-sm ${sub} transition-colors hover:text-violet-400`}>
            <ArrowLeft size={14}/> Dashboard
          </Link>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-teal-400"/>
            <span className={`text-sm font-black ${tx}`}>Siparişler</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            {orders.length} kayıt
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

        <div className={`rounded-2xl border ${card} p-4`}>
          <div className="flex flex-wrap gap-2">
            {(["all", "new", "preparing", "done", "cancelled"] as const).map(status => (
              <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-xl px-3 py-2 text-xs font-black ${filter === status ? "bg-teal-600 text-white" : isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                {status === "all" ? "Tümü" : STATUS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Bugün", stats.today],
            ["Son 7 Gün", stats.week],
            ["Bu Ay", stats.month],
          ].map(([label, value]) => (
            <div key={label as string} className={`rounded-2xl border ${card} p-4`}>
              <p className={`text-xs font-black uppercase tracking-wider ${sub}`}>{label}</p>
              <p className={`mt-2 text-2xl font-black ${tx}`}>{stats.currency}{Number(value).toFixed(2)}</p>
            </div>
          ))}
        </div>

        {stats.topProducts.length > 0 && (
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-sm font-black ${tx}`}>En Çok Satan Ürünler</p>
            <div className="mt-3 grid gap-2">
              {stats.topProducts.map(product => (
                <div key={product.name} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <span className={tx}>{product.name}</span>
                  <span className="font-black text-teal-500">{product.qty} adet · {stats.currency}{product.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className={`rounded-2xl border ${card} p-8 text-center ${sub}`}>
              {loading ? "Siparişler yükleniyor..." : "Henüz sipariş yok."}
            </div>
          ) : filtered.map(order => (
            <div key={order.id} className={`rounded-2xl border ${card} p-4`}>
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
                    <span className="font-black text-teal-500">{order.currency}{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {order.note && <p className={`mt-3 text-sm font-semibold ${sub}`}>Not: {order.note}</p>}
              <p className={`mt-4 text-right text-lg font-black ${tx}`}>Toplam: {order.currency}{order.subtotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuData, MenuOrder } from "@/lib/menu";

type FlatItem = {
  itemId: string;
  categoryId: string;
  name: string;
  price?: string;
};

type CartItem = FlatItem & { qty: number };
type PublicOrder = MenuOrder & {
  qrId?: string;
  qrSlug?: string;
  restaurantName?: string;
};

const STATUS_LABEL: Record<MenuOrder["status"], string> = {
  new: "Sipariş alındı",
  preparing: "Hazırlanıyor",
  done: "Tamamlandı",
  cancelled: "İptal edildi",
};

const STATUS_STYLE: Record<MenuOrder["status"], string> = {
  new: "bg-red-50 text-red-700 border-red-100",
  preparing: "bg-amber-50 text-amber-700 border-amber-100",
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function priceNumber(price?: string) {
  if (!price) return 0;
  const normalized = price.replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function storageKey(slug: string) {
  return `qr-publish-orders:${slug}`;
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function MenuOrderWidget({
  slug,
  menu,
  initialTable,
}: {
  slug: string;
  menu: MenuData;
  initialTable: number;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [myOrders, setMyOrders] = useState<PublicOrder[]>([]);

  const tableCount = Math.max(1, Math.min(999, Number(menu.tableCount || 10)));
  const tableNo = Number.isInteger(initialTable) && initialTable >= 1 && initialTable <= tableCount ? initialTable : 0;
  const hasTable = tableNo > 0;
  const enabled = menu.ordersEnabled !== false;
  const itemMap = useMemo(() => {
    const map = new Map<string, FlatItem>();
    menu.categories.forEach(category => {
      category.items.forEach(item => {
        if (item.name?.trim()) {
          map.set(item.id, { itemId: item.id, categoryId: category.id, name: item.name, price: item.price });
        }
      });
    });
    return map;
  }, [menu.categories]);

  const fetchTrackedOrders = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      setMyOrders([]);
      return;
    }
    const res = await fetch(`/api/v1/menu-orders?slug=${encodeURIComponent(slug)}&orderIds=${encodeURIComponent(ids.join(","))}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Sipariş durumu alınamadı.");
    setMyOrders((json.orders ?? []) as PublicOrder[]);
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = JSON.parse(window.localStorage.getItem(storageKey(slug)) || "[]") as unknown;
    if (Array.isArray(ids)) {
      setTrackedIds(ids.filter(id => typeof id === "string").slice(0, 10));
    }
  }, [slug]);

  useEffect(() => {
    if (!enabled || trackedIds.length === 0) return;
    void fetchTrackedOrders(trackedIds).catch(() => undefined);
    const interval = window.setInterval(() => {
      void fetchTrackedOrders(trackedIds).catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [enabled, fetchTrackedOrders, trackedIds]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("[data-menu-add]") as HTMLElement | null;
      const itemId = button?.dataset.menuAdd;
      if (!itemId) return;
      const item = itemMap.get(itemId);
      if (!item) return;
      setCart(prev => {
        const existing = prev.find(row => row.itemId === itemId);
        if (existing) return prev.map(row => row.itemId === itemId ? { ...row, qty: row.qty + 1 } : row);
        return [...prev, { ...item, qty: 1 }];
      });
      setOpen(true);
      setMessage("");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, itemMap]);

  const subtotal = cart.reduce((sum, item) => sum + priceNumber(item.price) * item.qty, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const activeOrderCount = myOrders.filter(order => order.status !== "done" && order.status !== "cancelled").length;

  const changeQty = (itemId: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.itemId === itemId ? { ...item, qty: item.qty + delta } : item)
      .filter(item => item.qty > 0));
  };

  const rememberOrder = (order: PublicOrder) => {
    const ids = [order.id, ...trackedIds.filter(id => id !== order.id)].slice(0, 10);
    setTrackedIds(ids);
    setMyOrders(prev => [order, ...prev.filter(item => item.id !== order.id)].slice(0, 10));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(ids));
    }
  };

  const submit = async () => {
    if (!cart.length) return;
    if (!hasTable) {
      setMessage("Sipariş vermek için masadaki QR kodu okutun.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/menu-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          tableNo,
          note,
          items: cart.map(item => ({ itemId: item.itemId, qty: item.qty })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Sipariş gönderilemedi.");
      if (json.order) rememberOrder(json.order as PublicOrder);
      setCart([]);
      setNote("");
      setMessage(`Sipariş alındı. Masa ${tableNo}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sipariş gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-2xl shadow-slate-950/30"
      >
        <span className="text-sm font-black">Sepet</span>
        <span className="flex items-center gap-2">
          {activeOrderCount > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">
              {activeOrderCount} aktif sipariş
            </span>
          )}
          <span className="rounded-full bg-teal-500 px-3 py-1 text-xs font-black">
            {hasTable ? `Masa ${tableNo}` : "Masa QR gerekli"} · {totalQty} ürün
          </span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 text-slate-950 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-base font-black">Masa Siparişi</p>
                <p className="text-xs font-semibold text-slate-500">Mali değeri yoktur.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Kapat</button>
            </div>

            {myOrders.length > 0 && (
              <section className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-black">Siparişlerim</p>
                  <button type="button" onClick={() => void fetchTrackedOrders(trackedIds).catch(() => undefined)} className="text-xs font-black text-teal-700">
                    Yenile
                  </button>
                </div>
                <div className="space-y-2">
                  {myOrders.map(order => (
                    <div key={order.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-slate-500">Masa {order.tableNo} · {formatTime(order.createdAt)}</p>
                          <p className="mt-1 text-sm font-black">{order.currency}{order.subtotal.toFixed(2)}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS_STYLE[order.status]}`}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                      <p className="mt-2 max-h-8 overflow-hidden text-xs font-semibold text-slate-500">
                        {order.items.map(item => `${item.qty} x ${item.name}`).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mb-3 grid grid-cols-[120px_1fr] gap-2">
              <div className={`rounded-xl border px-3 py-2 text-sm font-black ${hasTable ? "border-teal-200 bg-teal-50 text-teal-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {hasTable ? `Masa ${tableNo}` : "Masa yok"}
              </div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Not ekle" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            {!hasTable && (
              <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                Bu link genel menü linki. Sipariş almak için panelden masaya özel QR çıktısı alın.
              </p>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">Sepet boş.</p>
              ) : cart.map(item => (
                <div key={item.itemId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{menu.currency}{item.price || "0"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(item.itemId, -1)} className="h-8 w-8 rounded-lg bg-slate-100 font-black">-</button>
                    <span className="w-6 text-center text-sm font-black">{item.qty}</span>
                    <button type="button" onClick={() => changeQty(item.itemId, 1)} className="h-8 w-8 rounded-lg bg-slate-100 font-black">+</button>
                  </div>
                </div>
              ))}
            </div>

            {message && <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{message}</p>}

            <button
              type="button"
              disabled={!cart.length || loading || !hasTable}
              onClick={submit}
              className="mt-4 w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {loading ? "Gönderiliyor..." : `Siparişi Gönder · ${menu.currency}${subtotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

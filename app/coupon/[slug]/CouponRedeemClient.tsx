"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Ticket, XCircle } from "lucide-react";

type RedeemState =
  | { kind: "idle"; message: string }
  | { kind: "success"; message: string; discount?: string; description?: string }
  | { kind: "error"; message: string };

export default function CouponRedeemClient({
  slug,
  title,
  discount,
  description,
  validUntil,
}: {
  slug: string;
  title: string;
  discount: string;
  description?: string | null;
  validUntil?: string | null;
}) {
  const [code, setCode] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<RedeemState>({ kind: "idle", message: "Sipariş veya kupon kodunu girin." });

  async function redeem() {
    if (!code.trim()) {
      setState({ kind: "error", message: "Kupon kodu zorunlu." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code, order_ref: orderRef.trim() || null, channel: "public-landing" }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setState({
          kind: "success",
          message: body.message ?? "Kupon doğrulandı.",
          discount: body.discount ?? discount,
          description: body.description ?? description ?? undefined,
        });
        return;
      }
      setState({ kind: "error", message: body.message ?? "Kod doğrulanamadı." });
    } catch {
      setState({ kind: "error", message: "Kupon şu anda doğrulanamıyor." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-400 text-slate-950">
              <Ticket size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-fuchsia-200">Tek Kullanımlık Kupon</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{title}</h1>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
            <p className="text-sm text-fuchsia-100">İndirim</p>
            <p className="mt-1 text-3xl font-black">{discount}</p>
            {description ? <p className="mt-2 text-sm text-slate-200">{description}</p> : null}
            {validUntil ? <p className="mt-2 text-xs text-slate-300">Son geçerlilik: {new Date(validUntil).toLocaleDateString("tr-TR")}</p> : null}
          </div>

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-bold text-slate-200">
              Kupon kodu
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-base font-black text-slate-950 outline-none transition focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-300/20"
                placeholder="YAZ2026"
                autoComplete="one-time-code"
              />
            </label>
            <label className="block text-sm font-bold text-slate-200">
              Sipariş referansı
              <input
                value={orderRef}
                onChange={(event) => setOrderRef(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-300/20"
                placeholder="Opsiyonel"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={redeem}
            disabled={loading}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-400 px-4 text-sm font-black text-slate-950 transition hover:bg-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Ticket size={18} />}
            Kodu Kullan
          </button>

          <div className={`mt-4 flex gap-2 rounded-2xl border p-3 text-sm ${
            state.kind === "success"
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
              : state.kind === "error"
                ? "border-red-300/30 bg-red-300/10 text-red-50"
                : "border-white/10 bg-white/5 text-slate-300"
          }`}>
            {state.kind === "success" ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : state.kind === "error" ? <XCircle className="mt-0.5 shrink-0" size={18} /> : <Ticket className="mt-0.5 shrink-0" size={18} />}
            <div>
              <p className="font-bold">{state.message}</p>
              {state.kind === "success" && state.discount ? <p className="mt-1">Uygulanan indirim: {state.discount}</p> : null}
              {state.kind === "success" && state.description ? <p className="mt-1 text-emerald-100/80">{state.description}</p> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

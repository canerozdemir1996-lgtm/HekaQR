"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, UserRound } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  qr_title: string | null;
  qr_slug: string | null;
  created_at: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/leads?limit=100", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Yüklenemedi.");
      setLeads(Array.isArray(body.leads) ? body.leads : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Leadler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/v1/leads?format=csv", { cache: "no-store" });
      if (!response.ok) throw new Error("Dışa aktarılamadı.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dışa aktarılamadı.");
    } finally {
      setExporting(false);
    }
  };

  const pageBg = "min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Dashboard</p>
            <h1 className="text-2xl font-black tracking-tight">Leadler</h1>
            <p className={`mt-1 text-sm font-semibold ${subtle}`}>Dijital kartvizit sayfanızda bırakılan iletişim bilgileri.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void exportCsv()}
              disabled={exporting || leads.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Download size={16} className={exporting ? "animate-pulse" : ""} /> CSV İndir
            </button>
            <button onClick={() => void load()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="Yenile">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <section className={`${panel} p-5`}>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-violet-500" size={28} />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                <UserRound size={24} />
              </div>
              <div>
                <h2 className="text-base font-black">Henüz lead yok</h2>
                <p className={`mt-1 text-sm ${subtle}`}>
                  Dijital kartvizit QR&apos;ınızda &quot;Lead Collection&quot;ı açtığınızda, ziyaretçiler bilgi bıraktıkça burada görünür.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className={`border-b border-slate-200 text-xs uppercase tracking-widest ${subtle} dark:border-white/10`}>
                  <tr>
                    <th className="py-3 pr-4">Ad Soyad</th>
                    <th className="py-3 pr-4">E-posta</th>
                    <th className="py-3 pr-4">Telefon</th>
                    <th className="py-3 pr-4">vCard</th>
                    <th className="py-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="py-3 pr-4 font-bold">{lead.name}</td>
                      <td className="py-3 pr-4">{lead.email || "—"}</td>
                      <td className="py-3 pr-4">{lead.phone || "—"}</td>
                      <td className="py-3 pr-4">{lead.qr_title || "—"}</td>
                      <td className="py-3 text-right text-slate-500">{new Date(lead.created_at).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

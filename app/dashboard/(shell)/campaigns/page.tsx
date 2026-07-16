"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarClock, FolderKanban, Megaphone, Plus, QrCode, RefreshCw, Target, TicketPercent } from "lucide-react";
import { fetchFolders, fetchQrCodes, type QrCode as QrCodeType, type QrFolder } from "@/lib/supabase";
import { groupByUtmCampaign, UNTAGGED_UTM_CAMPAIGN } from "@/lib/qr-grouping";

type CampaignSummary = {
  id: string;
  name: string;
  codes: QrCodeType[];
  sources: string[];
  mediums: string[];
};

function compactUnique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

export default function CampaignsPage() {
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError("");
    try {
      const [folderRows, qrRows] = await Promise.all([fetchFolders(), fetchQrCodes()]);
      setFolders(folderRows);
      setQrs(qrRows);
      setError("");
    } catch (e) {
      if (showLoading) setError(e instanceof Error ? e.message : "Kampanya verileri yüklenemedi.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    const interval = window.setInterval(refresh, 120000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("qrpublish:dashboard-change", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("qrpublish:dashboard-change", refresh);
    };
  }, [load]);

  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder.name])), [folders]);

  const campaigns = useMemo<CampaignSummary[]>(() => {
    return groupByUtmCampaign(qrs)
      .map(({ name, codes }) => ({
        id: name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
        name,
        codes,
        sources: compactUnique(codes.map((qr) => qr.utm_source)),
        mediums: compactUnique(codes.map((qr) => qr.utm_medium)),
      }))
      .sort((a, b) => {
        if (a.name === UNTAGGED_UTM_CAMPAIGN) return 1;
        if (b.name === UNTAGGED_UTM_CAMPAIGN) return -1;
        return b.codes.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0) - a.codes.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0);
      });
  }, [qrs]);

  const totals = useMemo(() => {
    const campaignCodes = qrs.filter((qr) => qr.utm_campaign?.trim());
    return {
      campaigns: campaigns.filter((campaign) => campaign.name !== UNTAGGED_UTM_CAMPAIGN).length,
      codes: campaignCodes.length,
      active: campaignCodes.filter((qr) => qr.is_active).length,
      scans: campaignCodes.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0),
    };
  }, [campaigns, qrs]);

  const panel = "rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 transition-colors dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Pazarlama</p>
            <h1 className="text-2xl font-black tracking-tight">UTM Kampanyaları</h1>
            <p className={`mt-1 max-w-2xl text-sm font-semibold ${subtle}`}>
              Klasörler QR&apos;ları düzenlemek içindir. Kampanyalar ise UTM kampanya adı, kaynak, hedef ve performans raporu için kullanılır.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/folders"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex"
            >
              <FolderKanban size={16} />
              Klasörleri yönet
            </Link>
            <Link
              href="/dashboard/qrcodes/new"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              <Plus size={16} />
              Yeni QR Oluştur
            </Link>
            <button
              onClick={() => void load()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Yenile"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "UTM Kampanya", value: totals.campaigns, icon: Megaphone },
            { label: "Kampanya QR", value: totals.codes, icon: QrCode },
            { label: "Aktif QR", value: totals.active, icon: Target },
            { label: "Tarama", value: totals.scans.toLocaleString("tr-TR"), icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${panel} p-4`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <Icon size={18} />
                </div>
                <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>{item.label}</p>
                <p className="mt-1 text-2xl font-black">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className={`${panel} mb-6 grid gap-4 p-5 lg:grid-cols-3`}>
          <div className="flex gap-3">
            <FolderKanban className="mt-1 h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <h2 className="text-sm font-black">Klasör</h2>
              <p className={`mt-1 text-sm font-semibold leading-6 ${subtle}`}>
                Operasyonel gruplama yapar: kataloglar, restoranlar, müşteriler veya ekip koleksiyonları. QR bulmayı ve toplu işlemleri kolaylaştırır.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Megaphone className="mt-1 h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <h2 className="text-sm font-black">UTM kampanyası</h2>
              <p className={`mt-1 text-sm font-semibold leading-6 ${subtle}`}>
                Pazarlama ölçümü yapar: UTM kampanya, kaynak, medium, tarih hedefi ve performans takibi. Aynı QR hem klasörde hem kampanyada olabilir.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <TicketPercent className="mt-1 h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <h2 className="text-sm font-black">Kupon kampanyası</h2>
              <p className={`mt-1 text-sm font-semibold leading-6 ${subtle}`}>
                Yalnız kupon QR türünün kod, indirim ve kullanım limitlerini yönetir. Bu UTM performans listesinden ayrı bir ürün kaydıdır.
              </p>
            </div>
          </div>
        </section>

        <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className={`${panel} h-48 animate-pulse`} />)
          ) : campaigns.length === 0 ? (
            <div className={`${panel} col-span-full flex flex-col items-center justify-center px-6 py-20 text-center`}>
              <Megaphone size={34} className="mb-3 text-violet-500" />
              <h2 className="text-xl font-black">Henüz kampanya verisi yok</h2>
              <p className={`mt-2 max-w-md text-sm ${subtle}`}>
                QR oluştururken UTM kampanya alanını doldurduğunuzda performans burada gruplanır.
              </p>
              <Link href="/dashboard/qrcodes/new" className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500">
                QR oluşturmaya git
              </Link>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const scans = campaign.codes.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0);
              const active = campaign.codes.filter((qr) => qr.is_active).length;
              const latest = campaign.codes
                .map((qr) => qr.updated_at || qr.created_at)
                .filter(Boolean)
                .sort()
                .at(-1);
              return (
                <article key={campaign.id} className={`${panel} overflow-hidden`}>
                  <div className="border-b border-slate-200 p-5 dark:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-black">{campaign.name}</h2>
                        <p className={`mt-1 text-sm ${subtle}`}>
                          {campaign.codes.length} QR, {active} aktif, {scans.toLocaleString("tr-TR")} tarama
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        <CalendarClock size={13} />
                        {latest ? new Date(latest).toLocaleDateString("tr-TR") : "Genel"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.sources.map((source) => <span key={source} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">source: {source}</span>)}
                      {campaign.mediums.map((medium) => <span key={medium} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">medium: {medium}</span>)}
                    </div>
                  </div>
                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
                    {campaign.codes.map((qr) => (
                      <div key={qr.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-bold">{qr.title}</p>
                          <p className={`truncate font-mono text-xs ${subtle}`}>/q/{qr.short_slug}</p>
                          <p className={`mt-1 truncate text-xs font-semibold ${subtle}`}>{qr.folder_id ? `Klasör: ${folderById.get(qr.folder_id) ?? "Bilinmeyen"}` : "Klasörsüz"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black">{qr.scan_count ?? 0}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${subtle}`}>Tarama</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

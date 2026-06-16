"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Sun,
  X,
} from "lucide-react";
import {
  fetchFolders,
  fetchQrCodes,
  createFolder,
  type QrCode as QrCodeType,
  type QrFolder,
} from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type CampaignSummary = {
  id: string;
  name: string;
  createdAt?: string;
  codes: QrCodeType[];
};

export default function CampaignsPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [folderRows, qrRows] = await Promise.all([fetchFolders(), fetchQrCodes()]);
      setFolders(folderRows);
      setQrs(qrRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kampanyalar yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      setFolderSaving(true);
      const folder = await createFolder(name);
      setFolders((prev) => [folder, ...prev]);
      setNewFolderName("");
      setFolderModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klasör oluşturulamadı.");
    } finally {
      setFolderSaving(false);
    }
  }

  const campaigns = useMemo<CampaignSummary[]>(() => {
    const byFolder = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      createdAt: folder.created_at,
      codes: qrs.filter((qr) => qr.folder_id === folder.id),
    }));

    const uncategorized = qrs.filter((qr) => !qr.folder_id);
    if (uncategorized.length === 0) return byFolder;

    return [
      {
        id: "uncategorized",
        name: "Klasorsuz QR'lar",
        codes: uncategorized,
      },
      ...byFolder,
    ];
  }, [folders, qrs]);

  const totals = useMemo(() => {
    return {
      campaigns: campaigns.length,
      codes: qrs.length,
      active: qrs.filter((qr) => qr.is_active).length,
      scans: qrs.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0),
    };
  }, [campaigns.length, qrs]);

  const pageBg = "min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Dashboard'a don"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Dashboard</p>
              <h1 className="text-2xl font-black tracking-tight">Kampanyalar</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFolderModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Plus size={16} />
              Yeni Klasör
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title={isDark ? "Gunduz modu" : "Gece modu"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={load}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Yenile"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500"
            >
              <LayoutDashboard size={16} />
              QR Listesi
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Kampanya", value: totals.campaigns, icon: FolderKanban },
            { label: "Toplam QR", value: totals.codes, icon: QrCode },
            { label: "Aktif QR", value: totals.active, icon: BarChart3 },
            { label: "Tarama", value: totals.scans.toLocaleString("tr-TR"), icon: RefreshCw },
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

        <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${panel} h-48 animate-pulse`} />
            ))
          ) : campaigns.length === 0 ? (
            <div className={`${panel} col-span-full flex flex-col items-center justify-center px-6 py-20 text-center`}>
              <FolderKanban size={34} className="mb-3 text-violet-500" />
              <h2 className="text-xl font-black">Henuz kampanya yok</h2>
              <p className={`mt-2 max-w-md text-sm ${subtle}`}>
                QR olustururken klasor secerek kampanyalarinizi burada gruplayabilirsiniz.
              </p>
              <Link href="/dashboard" className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500">
                QR olusturmaya git
              </Link>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const scans = campaign.codes.reduce((sum, qr) => sum + (qr.scan_count ?? 0), 0);
              const active = campaign.codes.filter((qr) => qr.is_active).length;
              return (
                <article key={campaign.id} className={`${panel} overflow-hidden`}>
                  <div className="border-b border-slate-200 p-5 dark:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black">{campaign.name}</h2>
                        <p className={`mt-1 text-sm ${subtle}`}>
                          {campaign.codes.length} QR, {active} aktif, {scans.toLocaleString("tr-TR")} tarama
                        </p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString("tr-TR") : "Genel"}
                      </span>
                    </div>
                  </div>
                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
                    {campaign.codes.length === 0 ? (
                      <p className={`p-5 text-sm ${subtle}`}>Bu kampanyada henuz QR yok.</p>
                    ) : (
                      campaign.codes.map((qr) => (
                        <div key={qr.id} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{qr.title}</p>
                            <p className={`truncate font-mono text-xs ${subtle}`}>/q/{qr.short_slug}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black">{qr.scan_count ?? 0}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${subtle}`}>Tarama</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })
          )}
        </main>
      </div>
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFolderModalOpen(false)} aria-label="Kapat" />
          <form
            onSubmit={(e) => { e.preventDefault(); void handleCreateFolder(); }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black">Yeni klasör</h3>
                <p className={`mt-1 text-sm ${subtle}`}>QR kampanyalarını katalog, menü veya müşteri bazında grupla.</p>
              </div>
              <button type="button" onClick={() => setFolderModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className={`mb-1.5 block text-xs font-bold uppercase tracking-widest ${subtle}`}>Klasör adı</label>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Örn: Katalog"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-violet-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setFolderModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">İptal</button>
              <button type="submit" disabled={folderSaving || !newFolderName.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                {folderSaving && <Loader2 size={15} className="animate-spin" />} Oluştur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

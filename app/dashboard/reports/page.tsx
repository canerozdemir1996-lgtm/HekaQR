"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  Moon,
  QrCode,
  RefreshCw,
  Smartphone,
  Sun,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/theme";

type FolderRow = { id: string; name: string; created_at: string };
type QrRow = {
  id: string;
  title: string;
  short_slug: string;
  folder_id: string | null;
  scan_count: number | null;
  is_active: boolean | null;
};
type ReportData = {
  totals: { qrs: number; active_qrs: number; scans: number; total_scans: number; unique_scans: number; countries: number; cities: number };
  filters?: { folder: string; qr: string; days: number; from: string; to: string; page: number; limit: number };
  folders: FolderRow[];
  qrs: QrRow[];
  daily: { date: string; count: number }[];
  countries: { country: string; count: number }[];
  cities: { city: string; count: number }[];
  devices: { device: string; count: number }[];
  os: { os: string; count: number }[];
  browsers: { browser: string; count: number }[];
  top_qr: { id: string; title: string; short_slug: string; folder_name: string | null; scan_count: number; total_scan_count: number }[];
  recent_scans: { id: number; title: string; short_slug: string; scanned_at: string; country: string; city: string; device: string; os: string; browser: string }[];
  recent_pagination?: { page: number; limit: number; total: number; total_pages: number };
};

const pieColors = ["#7c3aed", "#2563eb", "#059669", "#f59e0b", "#e11d48", "#0891b2"];
const countryPoints: Record<string, { x: number; y: number }> = {
  "United States": { x: 430, y: 330 },
  "United States of America": { x: 430, y: 330 },
  "Türkiye": { x: 1168, y: 255 },
  "Turkey": { x: 1168, y: 255 },
  "Germany": { x: 1040, y: 205 },
  "United Kingdom": { x: 965, y: 185 },
  "France": { x: 992, y: 235 },
  "Netherlands": { x: 1006, y: 190 },
  "Bulgaria": { x: 1128, y: 222 },
  "Saudi Arabia": { x: 1238, y: 410 },
  "United Arab Emirates": { x: 1305, y: 395 },
  "Singapore": { x: 1504, y: 545 },
  "China": { x: 1510, y: 300 },
  "Japan": { x: 1740, y: 300 },
  "Brazil": { x: 690, y: 575 },
  "Canada": { x: 410, y: 220 },
  "Australia": { x: 1675, y: 690 },
};

function fmt(value: number) {
  return value.toLocaleString("tr-TR");
}

function fallbackPoint(country: string) {
  let hash = 0;
  for (let i = 0; i < country.length; i += 1) hash = (hash * 31 + country.charCodeAt(i)) % 997;
  return { x: 780 + (hash % 520), y: 210 + (hash % 260) };
}

function WorldHeatMap({ countries, isDark }: { countries: ReportData["countries"]; isDark: boolean }) {
  const max = Math.max(1, ...countries.map(item => item.count));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_280px]">
      <div className={`relative min-h-[240px] overflow-hidden rounded-2xl border ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,0.12),transparent_58%)]" />
        <svg viewBox="0 0 2000 857" className="absolute inset-0 h-full w-full p-4" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <image href="/world.svg" width="2000" height="857" opacity={isDark ? "0.42" : "0.82"} />
          {countries.slice(0, 20).map((item) => {
            const point = countryPoints[item.country] ?? fallbackPoint(item.country);
            const size = 14 + (item.count / max) * 26;
            return (
              <g
                key={item.country}
                className="drop-shadow-[0_10px_18px_rgba(37,99,235,0.28)]"
              >
                <title>{item.country} - {fmt(item.count)} tarama</title>
                <circle cx={point.x} cy={point.y} r={size * 1.35} fill="#2563eb" opacity="0.16" />
                <circle cx={point.x} cy={point.y} r={size * 0.76} fill="#2563eb" opacity="0.24" />
                <circle cx={point.x} cy={point.y} r={size * 0.5} fill="#2563eb" stroke="white" strokeWidth="8" />
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-white/85 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-lg dark:bg-slate-900/85 dark:text-slate-300">
          Ülke yoğunluğu tarama sayısına göre ölçeklenir.
        </div>
      </div>
      <div className="space-y-2">
        {countries.slice(0, 10).map((item) => (
          <div key={item.country} className={`rounded-xl p-2.5 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-black">{item.country}</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-300">{fmt(item.count)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {countries.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:bg-white/[0.04]">Bu aralıkta ülke verisi yok.</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#020617]" />}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const [folder, setFolder] = useState(params.get("folder") ?? "all");
  const [qr, setQr] = useState(params.get("qr") ?? "all");
  const [days, setDays] = useState(params.get("days") ?? "30");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<20 | 50 | 100>(20);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ folder, qr, days, page: String(page), limit: String(limit) });
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const response = await fetch(`/api/v1/reports?${query.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Rapor yüklenemedi.");
      setReport(body.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [folder, qr, days, from, to, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleQrs = report?.qrs ?? [];
  const top = report?.top_qr[0];
  const isSingleQr = qr !== "all";
  const pagination = report?.recent_pagination ?? { page, limit, total: 0, total_pages: 1 };
  const devicePie = useMemo(() => (report?.devices ?? []).map((item) => ({ name: item.device, value: item.count })), [report]);
  const browserPie = useMemo(() => (report?.browsers ?? []).map((item) => ({ name: item.browser, value: item.count })), [report]);

  const pageBg = "min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Dashboard'a dön"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Analitik</p>
              <h1 className="text-2xl font-black tracking-tight">Tarama Raporları</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title={isDark ? "Gündüz modu" : "Gece modu"}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="Yenile">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500">
              <LayoutDashboard size={16} /> QR Listesi
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <section className={`${panel} mb-6 p-4`}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className={`mb-1 block text-xs font-bold uppercase tracking-widest ${subtle}`}>Klasör</span>
              <select value={folder} onChange={(e) => { setFolder(e.target.value); setQr("all"); setPage(1); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950">
                <option value="all">Tüm klasörler</option>
                <option value="uncategorized">Klasörsüz</option>
                {(report?.folders ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={`mb-1 block text-xs font-bold uppercase tracking-widest ${subtle}`}>QR</span>
              <select value={qr} onChange={(e) => { setQr(e.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950">
                <option value="all">Tüm QR kodlar</option>
                {visibleQrs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <div>
              <span className={`mb-1 block text-xs font-bold uppercase tracking-widest ${subtle}`}>Dönem</span>
              <div className="flex h-11 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950">
                {["7", "30", "90"].map((item) => (
                  <button key={item} onClick={() => { setDays(item); setFrom(""); setTo(""); setPage(1); }} className={`rounded-lg px-3 text-sm font-black transition-colors ${days === item && !from && !to ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
                    {item}g
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className={`mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest ${subtle}`}><CalendarDays size={13}/> Başlangıç</span>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950" />
            </label>
            <label className="block">
              <span className={`mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest ${subtle}`}><CalendarDays size={13}/> Bitiş</span>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950" />
            </label>
            <div className="flex items-end">
              <button onClick={() => { setFrom(""); setTo(""); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                Takvimi Temizle
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            { label: "Dönem Taraması", value: fmt(report?.totals.scans ?? 0), icon: BarChart3 },
            { label: "Total Scan", value: fmt(report?.totals.total_scans ?? 0), icon: RefreshCw },
            { label: "Unique Scans", value: fmt(report?.totals.unique_scans ?? 0), icon: Smartphone },
            { label: "Aktif QR", value: fmt(report?.totals.active_qrs ?? 0), icon: QrCode },
            { label: "Ülke", value: fmt(report?.totals.countries ?? 0), icon: Globe2 },
            ...(!isSingleQr ? [{ label: "Lider", value: top?.title ?? "-", icon: Trophy }] : []),
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${panel} p-4`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Icon size={18} /></div>
                <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>{item.label}</p>
                <p className="mt-1 truncate text-2xl font-black">{item.value}</p>
              </div>
            );
          })}
        </section>

        <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <section className={`${panel} p-5 lg:col-span-2`}>
            <h2 className="mb-4 text-lg font-black">Günlük Taramalar</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report?.daily ?? []}>
                  <defs>
                    <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#e2e8f0"} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#scanFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`${panel} p-5`}>
            <h2 className="mb-4 text-lg font-black">Cihaz Dağılımı</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devicePie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {devicePie.map((_, index) => <Cell key={index} fill={pieColors[index % pieColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`${panel} p-5`}>
            <h2 className="mb-4 text-lg font-black">Browser Dağılımı</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={browserPie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {browserPie.map((_, index) => <Cell key={index} fill={pieColors[(index + 2) % pieColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`${panel} p-5 lg:col-span-2`}>
            <h2 className="mb-4 text-lg font-black">Ülke Bazlı Tarama</h2>
            <WorldHeatMap countries={report?.countries ?? []} isDark={isDark} />
          </section>

          {!isSingleQr && <section className={`${panel} p-5`}>
            <h2 className="mb-4 text-lg font-black">En Çok Taranan QR</h2>
            <div className="space-y-3">
              {(report?.top_qr ?? []).slice(0, 7).map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{item.title}</p>
                    <p className={`truncate font-mono text-xs ${subtle}`}>/q/{item.short_slug}</p>
                  </div>
                  <span className="text-sm font-black">{fmt(item.scan_count)}</span>
                  <button
                    onClick={() => setQr(item.id)}
                    className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11px] font-black text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25"
                  >
                    Analytics
                  </button>
                </div>
              ))}
            </div>
          </section>}

          <section className={`${panel} p-5 lg:col-span-3`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">Son Taramalar</h2>
              <div className="flex items-center gap-2">
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value) as 20 | 50 | 100); setPage(1); }} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black outline-none dark:border-white/10 dark:bg-slate-950">
                  <option value={20}>20 kayıt</option>
                  <option value={50}>50 kayıt</option>
                  <option value={100}>100 kayıt</option>
                </select>
                <Smartphone size={18} className="text-violet-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className={`border-b border-slate-200 text-xs uppercase tracking-widest ${subtle} dark:border-white/10`}>
                  <tr>
                    <th className="py-3 pr-4">QR</th>
                    <th className="py-3 pr-4">Konum</th>
                    <th className="py-3 pr-4">Cihaz</th>
                    <th className="py-3 pr-4">Browser</th>
                    <th className="py-3 pr-4">OS</th>
                    <th className="py-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {(report?.recent_scans ?? []).map((scan) => (
                    <tr key={scan.id}>
                      <td className="py-3 pr-4 font-bold">{scan.title}</td>
                      <td className="py-3 pr-4">{scan.country} / {scan.city}</td>
                      <td className="py-3 pr-4">{scan.device}</td>
                      <td className="py-3 pr-4">{scan.browser}</td>
                      <td className="py-3 pr-4">{scan.os}</td>
                      <td className="py-3 text-right text-slate-500">{new Date(scan.scanned_at).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                  {!loading && (report?.recent_scans ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className={`py-10 text-center ${subtle}`}>Bu filtrede henüz tarama yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm font-semibold ${subtle}`}>
                {fmt(pagination.total)} kayıt · Sayfa {pagination.page}/{pagination.total_pages}
              </p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <ChevronLeft size={14}/> Önceki
                </button>
                <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Sonraki <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

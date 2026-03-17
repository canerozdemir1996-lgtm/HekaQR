"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2, Activity, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet,
  Globe, QrCode, Users, Loader2, RefreshCw, ArrowLeft, Calendar,
  Zap, Target, Award, Eye, Hash,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

interface AdminStats {
  total_users: number;
  total_qr: number;
  total_scans: number;
  active_qr: number;
  daily_scans: { date: string; count: number }[];
  top_qr: { title: string; short_slug: string; scan_count: number }[];
  device_breakdown: { device: string; count: number }[];
  country_breakdown: { country: string; count: number }[];
}

interface QrRow {
  id: string;
  title: string;
  short_slug: string;
  qr_type: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  user_id: string;
  user_email?: string;
}

function StatCard({ label, value, sub, icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
          {trend >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, color = "#7c3aed" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-full w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-opacity hover:opacity-100 opacity-80 cursor-default"
          style={{ height: `${Math.max((v / max) * 100, 2)}%`, background: `linear-gradient(to top, ${color}, ${color}99)` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [qrList, setQrList] = useState<QrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.user_metadata?.role !== "admin") {
        router.push("/login");
      }
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, qRes] = await Promise.all([
        fetch("/api/admin/stats").then(r => r.json()),
        fetch("/api/admin/qrcodes").then(r => r.json()),
      ]);
      setStats(sRes.stats ?? null);
      setQrList(qRes.qrcodes ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bg = isDark ? "bg-[#080b14]" : "bg-[#f4f6f9]";
  const card = isDark ? "bg-[#0c0f1a] border-slate-800" : "bg-white border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";

  const slicedDaily = stats?.daily_scans.slice(-range) ?? [];
  const totalInRange = slicedDaily.reduce((a, b) => a + b.count, 0);
  const prevSlice = stats?.daily_scans.slice(-range * 2, -range) ?? [];
  const prevTotal = prevSlice.reduce((a, b) => a + b.count, 0);
  const trend = prevTotal > 0 ? Math.round(((totalInRange - prevTotal) / prevTotal) * 100) : 0;

  const weeklyAvg = slicedDaily.length ? Math.round(totalInRange / Math.ceil(slicedDaily.length / 7)) : 0;
  const peakDay = slicedDaily.reduce((a, b) => b.count > (a?.count ?? 0) ? b : a, slicedDaily[0]);

  const qrTypeMap = qrList.reduce((acc: Record<string, number>, q) => {
    acc[q.qr_type || "url"] = (acc[q.qr_type || "url"] || 0) + 1;
    return acc;
  }, {});

  const typeColors: Record<string, string> = {
    url: "#7c3aed", vcard: "#3b82f6", wifi: "#10b981",
    sms: "#f59e0b", email: "#ec4899", whatsapp: "#22c55e",
    text: "#64748b", phone: "#f97316",
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 border-b ${isDark ? "bg-[#0c0f1a]/95 border-slate-800" : "bg-white/95 border-slate-200"} backdrop-blur-xl px-6 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className={`flex items-center gap-1.5 text-sm ${sub} hover:text-violet-400 transition-colors`}>
            <ArrowLeft size={14}/> Admin
          </button>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-violet-400"/>
            <span className={`font-black text-sm ${tx}`}>Analizler</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${range === r ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                {r}g
              </button>
            ))}
          </div>
          <button onClick={load}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${isDark ? "border-slate-700 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""}/>
            Yenile
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="animate-spin text-violet-400"/>
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Toplam Tarama" value={totalInRange.toLocaleString("tr-TR")}
                sub={`son ${range} gün`} icon={<Activity size={18}/>} color="#7c3aed" trend={trend}/>
              <StatCard label="Haftalık Ortalama" value={weeklyAvg.toLocaleString("tr-TR")}
                sub="tarama/hafta" icon={<TrendingUp size={18}/>} color="#3b82f6"/>
              <StatCard label="Aktif QR" value={stats.active_qr}
                sub={`${stats.total_qr} toplam`} icon={<QrCode size={18}/>} color="#10b981"/>
              <StatCard label="Toplam Kullanıcı" value={stats.total_users}
                icon={<Users size={18}/>} color="#f59e0b"
                sub={`${Math.round(stats.total_qr / (stats.total_users || 1))} QR/kullanıcı`}/>
            </div>

            {/* Main chart */}
            <div className={`rounded-2xl border ${card} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`font-black text-base ${tx}`}>Günlük Tarama Trendi</h2>
                  <p className={`text-xs ${sub} mt-0.5`}>Son {range} gün · {totalInRange.toLocaleString("tr-TR")} toplam tarama</p>
                </div>
                <div className="flex items-center gap-4">
                  {peakDay && (
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Zirve Gün</p>
                      <p className={`text-sm font-black text-violet-400`}>{peakDay.count} tarama</p>
                      <p className={`text-[10px] ${sub}`}>{peakDay.date}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-40">
                <MiniBarChart data={slicedDaily.map(d => d.count)}/>
              </div>
              <div className="flex justify-between mt-2">
                <span className={`text-[10px] ${sub}`}>{slicedDaily[0]?.date}</span>
                <span className={`text-[10px] ${sub}`}>{slicedDaily[slicedDaily.length - 1]?.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Top QR */}
              <div className={`lg:col-span-2 rounded-2xl border ${card} p-5`}>
                <div className="flex items-center gap-2 mb-5">
                  <Award size={14} className="text-amber-400"/>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>En Çok Taranan QR Kodlar</h3>
                </div>
                <div className="space-y-3">
                  {stats.top_qr.slice(0, 10).map((qr, i) => {
                    const maxScan = stats.top_qr[0]?.scan_count || 1;
                    const pct = Math.round((qr.scan_count / maxScan) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-[10px] font-black w-5 text-center shrink-0 ${i < 3 ? "text-amber-400" : sub}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-semibold truncate ${tx}`}>{qr.title}</p>
                            <span className="text-sm font-black text-violet-400 ml-2 shrink-0">{qr.scan_count.toLocaleString("tr-TR")}</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-slate-200"}`}>
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all"
                              style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stats.top_qr.length === 0 && (
                    <div className="py-10 text-center">
                      <Eye size={24} className={`mx-auto mb-2 ${sub}`}/>
                      <p className={`text-sm ${sub}`}>Henüz tarama yok</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Device breakdown */}
                <div className={`rounded-2xl border ${card} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone size={13} className="text-violet-400"/>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>Cihaz Dağılımı</h3>
                  </div>
                  {stats.device_breakdown.slice(0, 5).map((d, i) => {
                    const total = stats.device_breakdown.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = Math.round((d.count / total) * 100);
                    const icon = d.device?.toLowerCase().includes("mobile")
                      ? <Smartphone size={11}/>
                      : d.device?.toLowerCase().includes("tablet")
                      ? <Tablet size={11}/>
                      : <Monitor size={11}/>;
                    return (
                      <div key={i} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`flex items-center gap-1.5 capitalize ${tx}`}>
                            {icon} {d.device || "Diğer"}
                          </span>
                          <span className={`font-bold ${sub}`}>{pct}% <span className={`font-normal ${sub}`}>({d.count})</span></span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-slate-200"}`}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: i === 0 ? "#7c3aed" : i === 1 ? "#3b82f6" : "#10b981" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Country breakdown */}
                <div className={`rounded-2xl border ${card} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={13} className="text-emerald-400"/>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>Ülke Dağılımı</h3>
                  </div>
                  {stats.country_breakdown.slice(0, 8).map((c, i) => (
                    <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? `border-t ${isDark ? "border-white/[0.05]" : "border-slate-100"}` : ""}`}>
                      <Globe size={11} className={sub}/>
                      <span className={`text-xs flex-1 truncate ${tx}`}>{c.country || "Bilinmiyor"}</span>
                      <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* QR Type + Performance grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* QR Type breakdown */}
              <div className={`rounded-2xl border ${card} p-5`}>
                <div className="flex items-center gap-2 mb-5">
                  <Hash size={13} className="text-violet-400"/>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>QR Tip Dağılımı</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(qrTypeMap).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pct = Math.round((count / (qrList.length || 1)) * 100);
                    const color = typeColors[type] || "#64748b";
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
                        <span className={`text-xs flex-1 capitalize ${tx}`}>{type}</span>
                        <div className={`w-24 h-1.5 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-slate-200"}`}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}/>
                        </div>
                        <span className={`text-xs font-bold w-8 text-right ${isDark ? "text-slate-300" : "text-slate-600"}`}>{count}</span>
                        <span className={`text-[10px] w-8 text-right ${sub}`}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary stats */}
              <div className={`rounded-2xl border ${card} p-5`}>
                <div className="flex items-center gap-2 mb-5">
                  <Target size={13} className="text-emerald-400"/>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>Genel Özet</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Toplam QR Kodu", value: stats.total_qr, color: "#7c3aed" },
                    { label: "Aktif QR Kodu", value: stats.active_qr, color: "#10b981" },
                    { label: "Pasif QR Kodu", value: stats.total_qr - stats.active_qr, color: "#ef4444" },
                    { label: "Toplam Tarama", value: stats.total_scans.toLocaleString("tr-TR"), color: "#3b82f6" },
                    { label: "Kayıtlı Kullanıcı", value: stats.total_users, color: "#f59e0b" },
                    { label: "Ort. QR/Kullanıcı", value: Math.round(stats.total_qr / (stats.total_users || 1)), color: "#ec4899" },
                    { label: "Ort. Tarama/QR", value: Math.round(stats.total_scans / (stats.total_qr || 1)), color: "#8b5cf6" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }}/>
                        <span className={`text-sm ${sub}`}>{s.label}</span>
                      </div>
                      <span className={`text-sm font-black ${tx}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly heatmap */}
            <div className={`rounded-2xl border ${card} p-5`}>
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={13} className="text-blue-400"/>
                <h3 className={`text-xs font-black uppercase tracking-widest ${sub}`}>Son 30 Gün — Tarama Yoğunluğu</h3>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${slicedDaily.length}, 1fr)` }}>
                {slicedDaily.map((d, i) => {
                  const max = Math.max(...slicedDaily.map(x => x.count), 1);
                  const intensity = d.count / max;
                  return (
                    <div key={i} title={`${d.date}: ${d.count} tarama`}
                      className="h-8 rounded-md cursor-default transition-all hover:scale-110"
                      style={{
                        background: intensity === 0
                          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"
                          : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`
                      }}/>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-[10px] ${sub}`}>{slicedDaily[0]?.date}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${sub}`}>Az</span>
                  {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(124,58,237,${o})` }}/>
                  ))}
                  <span className={`text-[10px] ${sub}`}>Çok</span>
                </div>
                <span className={`text-[10px] ${sub}`}>{slicedDaily[slicedDaily.length - 1]?.date}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Zap size={32} className={`mx-auto mb-3 ${sub}`}/>
              <p className={`text-sm ${sub}`}>Veri yüklenemedi</p>
              <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

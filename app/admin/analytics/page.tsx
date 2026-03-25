"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart2, Activity, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet,
  Globe, QrCode, Users, Loader2, RefreshCw, ArrowLeft, Calendar,
  Zap, Target, Award, Eye, Hash,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { getAuthHeaders, getSupabase } from "@/lib/supabase";
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
  isDark?: boolean;
}) {
  const isDarkTheme = isDark ?? true;
  return (
    <div className={`group relative rounded-[2.5rem] border ${isDarkTheme ? "bg-[#0b1121]/60 border-cyan-900/30 hover:bg-[#0b1121]/80 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]" : "bg-white/80 border-slate-200/60 hover:bg-white hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5"} p-8 flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-black/5 dark:shadow-none overflow-hidden`}>
      
      {/* Shine effect */}
      <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between mb-6">
        <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
          style={{ background: `${color}20`, color }}>
        {icon}
      </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm ${trend >= 0 ? (isDarkTheme ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border border-emerald-200") : (isDarkTheme ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : "text-rose-700 bg-rose-50 border border-rose-200")}`}>
            {trend >= 0 ? <TrendingUp size={14} strokeWidth={3}/> : <TrendingDown size={14} strokeWidth={3}/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${isDarkTheme ? "text-cyan-100/50" : "text-slate-500"}`}>{label}</p>
        <p className={`text-5xl font-black ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{value}</p>
        {sub && <p className={`text-sm font-bold mt-2 ${isDarkTheme ? "text-cyan-100/50" : "text-slate-500"}`}>{sub}</p>}
      </div>
    </div>
  );
}

function compactDate(d: string) {
  // expected YYYY-MM-DD
  try {
    const [y, m, dd] = d.split("-");
    return `${dd}.${m}`;
  } catch { return d; }
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [qrList, setQrList] = useState<QrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user.role as "admin" | "owner" | "user" | undefined)
      || (session?.user as any)?.user_metadata?.role
      || "user";

    if (status === "unauthenticated" || (role !== "admin" && role !== "owner")) {
      router.push("/login");
      return;
    }
  }, [router, session, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, qRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: await getAuthHeaders() }).then(r => r.json()),
        fetch("/api/admin/qrcodes", { headers: await getAuthHeaders() }).then(r => r.json()),
      ]);
      setStats(sRes.stats ?? null);
      setQrList(qRes.qrcodes ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const card = isDark ? "bg-[#0b1121]/60 border-cyan-900/30 shadow-xl shadow-black/10 backdrop-blur-2xl" : "bg-white/80 border-slate-200/60 shadow-xl shadow-slate-200/40 backdrop-blur-2xl";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-cyan-100/50" : "text-slate-500";

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

  const dailyChart = slicedDaily.map(d => ({ date: d.date, scans: d.count }));
  const devicePie = (stats?.device_breakdown ?? []).map(d => ({ name: d.device || "Diğer", value: d.count }));
  const countryPie = (stats?.country_breakdown ?? []).slice(0, 8).map(c => ({ name: c.country || "Bilinmiyor", value: c.count }));
  const pieColors = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#22c55e", "#64748b", "#f97316"];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200 transition-colors duration-500 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden`}>
      
      {/* Mission Control Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
      </div>

      {/* Mission Control Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.04]" 
           style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Floating Header */}
      <header className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className={`flex items-center justify-between gap-4 sm:gap-6 px-5 sm:px-6 py-4 rounded-[2rem] border transition-all duration-300 ${isDark ? "bg-[#0b1121]/60 border-cyan-900/30 backdrop-blur-2xl shadow-xl shadow-cyan-900/5" : "bg-white/70 border-slate-200/50 backdrop-blur-2xl shadow-xl shadow-slate-200/20"}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin")}
              className={`flex items-center justify-center w-10 h-10 rounded-[1.25rem] transition-all shadow-sm active:scale-95 ${isDark ? "bg-[#020617] border border-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
              <ArrowLeft size={18}/>
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <BarChart2 size={18} className="text-white"/>
              </div>
              <span className={`font-black text-lg ${tx}`}>Derin Analitik</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
          {/* Range selector */}
            <div className={`flex items-center gap-1 p-1.5 rounded-2xl border shadow-sm ${isDark ? "border-cyan-900/30 bg-[#020617]/50" : "border-slate-200/60 bg-white/60"}`}>
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${range === r
                    ? (isDark ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-emerald-500/10 text-emerald-600 shadow-sm")
                    : `${sub} hover:text-cyan-500 dark:hover:text-cyan-400`}`}>
                {r}g
              </button>
            ))}
          </div>
          <button onClick={load}
              className={`flex items-center justify-center w-11 h-11 rounded-[1.25rem] transition-all shadow-sm active:scale-95 ${isDark ? "bg-[#020617] border border-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={40} className="animate-spin text-cyan-500"/>
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <StatCard label="Toplam Tarama" value={totalInRange.toLocaleString("tr-TR")}
                sub={`son ${range} gün`} icon={<Activity size={24}/>} color={isDark ? "#22d3ee" : "#0d9488"} trend={trend} isDark={isDark}/>
              <StatCard label="Haftalık Ortalama" value={weeklyAvg.toLocaleString("tr-TR")}
                sub="tarama/hafta" icon={<TrendingUp size={24}/>} color={isDark ? "#38bdf8" : "#0284c7"} isDark={isDark}/>
              <StatCard label="Aktif QR" value={stats.active_qr}
                sub={`${stats.total_qr} toplam`} icon={<QrCode size={24}/>} color={isDark ? "#34d399" : "#059669"} isDark={isDark}/>
              <StatCard label="Toplam Kullanıcı" value={stats.total_users}
                icon={<Users size={24}/>} color={isDark ? "#fbbf24" : "#d97706"}
                sub={`${Math.round(stats.total_qr / (stats.total_users || 1))} QR/kullanıcı`} isDark={isDark}/>
            </div>

            {/* Main chart */}
            <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-10 animate-fade-in`} style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className={`font-black text-2xl tracking-tight ${tx}`}>Etkileşim Yoğunluğu</h2>
                  <p className={`text-sm font-medium ${sub} mt-1`}>Son {range} gün · {totalInRange.toLocaleString("tr-TR")} toplam tarama</p>
                </div>
                <div className="flex items-center gap-4">
                  {peakDay && (
                    <div className={`text-right p-4 rounded-2xl ${isDark ? "bg-[#020617]/50 border border-cyan-900/30" : "bg-slate-50 border border-slate-200/50"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Zirve Gün</p>
                      <p className={`text-xl font-black text-cyan-600 dark:text-cyan-400 leading-tight`}>{peakDay.count}</p>
                      <p className={`text-xs font-medium ${sub}`}>{peakDay.date}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChart} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradScans" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={compactDate} tick={{ fill: isDark ? "#475569" : "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: isDark ? "#475569" : "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(255, 255, 255, 0.9)",
                        border: isDark ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: '1.25rem',
                        color: isDark ? "#e2e8f0" : "#0f172a",
                        backdropFilter: "blur(20px)",
                        boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(6, 182, 212, 0.1)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: 700, marginBottom: '4px' }}
                      itemStyle={{ color: isDark ? "#22d3ee" : "#059669", fontSize: 16, fontWeight: 900 }}
                      formatter={(v: any) => [Number(v).toLocaleString("tr-TR"), ""]}
                      labelFormatter={(l: any) => String(l)}
                    />
                    <Area type="monotone" dataKey="scans" stroke="#06b6d4" strokeWidth={4} fill="url(#gradScans)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Top QR */}
              <div className={`xl:col-span-2 rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-500"}`}>
                    <Award size={20} strokeWidth={2.5}/>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${tx}`}>Lider Tablosu</h3>
                </div>
                <div className="space-y-4">
                  {stats.top_qr.slice(0, 10).map((qr, i) => {
                    const maxScan = stats.top_qr[0]?.scan_count || 1;
                    const pct = Math.round((qr.scan_count / maxScan) * 100);
                    return (
                      <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[1.5rem] border transition-all duration-300 group relative overflow-hidden ${isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-cyan-900/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-1" : "bg-white/40 border-slate-200/50 hover:bg-white hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"}`}>
                        <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                        
                        <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-sm font-black shadow-inner transition-transform group-hover:scale-110 shrink-0 ${isDark ? (i < 3 ? "bg-amber-500/20 text-amber-400" : "bg-cyan-950/50 text-cyan-400") : (i < 3 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600")}`}>
                            {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}`}>{qr.title}</p>
                            <p className={`text-[11px] font-mono mt-0.5 ${sub}`}>/q/{qr.short_slug}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:w-1/3 relative z-10">
                          <div className="flex-1">
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-[#020617] border border-cyan-900/30" : "bg-slate-100"}`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 relative transition-all duration-1000" style={{ width: `${pct}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}/>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 min-w-[60px]">
                            <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">{qr.scan_count.toLocaleString("tr-TR")}</span>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Tarama</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stats.top_qr.length === 0 && (
                    <div className={`py-16 text-center rounded-[1.5rem] border border-dashed ${isDark ? "border-cyan-900/30 bg-[#020617]/50" : "border-slate-300 bg-slate-50"}`}>
                      <Eye size={32} className={`mx-auto mb-4 ${isDark ? "text-cyan-900" : "text-slate-300"}`}/>
                      <p className={`text-base font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Henüz yeterli veri yok</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Device breakdown */}
                <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '400ms' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-500"}`}>
                      <Smartphone size={18} strokeWidth={2.5}/>
                    </div>
                    <h3 className={`text-sm font-black uppercase tracking-[0.15em] ${sub}`}>Cihaz</h3>
                  </div>
                  <div className="h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            background: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(255, 255, 255, 0.9)",
                            border: isDark ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: '1rem',
                            backdropFilter: "blur(20px)",
                            boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ color: isDark ? "#e2e8f0" : "#0f172a", fontWeight: 700 }}
                          formatter={(v: any, n: any) => [Number(v).toLocaleString("tr-TR"), String(n)]}
                        />
                        <Pie data={devicePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={3} stroke="none">
                          {devicePie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label for Pie */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-2xl font-black ${tx}`}>{devicePie.reduce((a,b)=>a+b.value,0)}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Total</span>
                    </div>
                  </div>
                </div>

                {/* Country breakdown */}
                <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '500ms' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-500"}`}>
                      <Globe size={18} strokeWidth={2.5}/>
                    </div>
                    <h3 className={`text-sm font-black uppercase tracking-[0.15em] ${sub}`}>Ülke</h3>
                  </div>
                  <div className="h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            background: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(255, 255, 255, 0.9)",
                            border: isDark ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: '1rem',
                            backdropFilter: "blur(20px)",
                            boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ color: isDark ? "#e2e8f0" : "#0f172a", fontWeight: 700 }}
                          formatter={(v: any, n: any) => [Number(v).toLocaleString("tr-TR"), String(n)]}
                        />
                        <Pie data={countryPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={3} stroke="none">
                          {countryPie.map((_, i) => <Cell key={i} fill={pieColors[(i + 3) % pieColors.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Type + Performance grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR Type breakdown */}
              <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '600ms' }}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-500"}`}>
                    <Hash size={20} strokeWidth={2.5}/>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${tx}`}>QR Türleri</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(qrTypeMap).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pct = Math.round((count / (qrList.length || 1)) * 100);
                    const color = typeColors[type] || "#64748b";
                    return (
                      <div key={type} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isDark ? "bg-white/[0.02] border-white/5" : "bg-white/50 border-slate-200/50"}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ background: `${color}15`, color }}>
                          <span className="font-bold text-sm">{type[0].toUpperCase()}</span>
                        </div>
                        <span className={`text-sm font-bold flex-1 capitalize ${tx}`}>{type}</span>
                        <div className="flex-1 max-w-[120px]">
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-[#020617] border border-white/5" : "bg-slate-100"}`}>
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }}/>
                          </div>
                        </div>
                        <div className="text-right w-12">
                          <span className={`text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>{count}</span>
                          <p className={`text-[9px] font-bold ${sub}`}>{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary stats */}
              <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '700ms' }}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-500"}`}>
                    <Target size={20} strokeWidth={2.5}/>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${tx}`}>Genel Özet</h3>
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
                    <div key={i} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${isDark ? "bg-white/[0.02] border-white/5" : "bg-white/50 border-slate-200/50"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-inner" style={{ background: s.color }}/>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{s.label}</span>
                      </div>
                      <span className={`text-lg font-black ${tx}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly heatmap */}
            <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-10 animate-fade-in`} style={{ animationDelay: '800ms' }}>
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-500"}`}>
                  <Calendar size={20} strokeWidth={2.5}/>
                </div>
                <h3 className={`text-lg font-black tracking-tight ${tx}`}>Tarama Yoğunluğu Haritası</h3>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${slicedDaily.length}, 1fr)` }}>
                {slicedDaily.map((d, i) => {
                  const max = Math.max(...slicedDaily.map(x => x.count), 1);
                  const intensity = d.count / max;
                  return (
                    <div key={i} title={`${d.date}: ${d.count} tarama`}
                      className="h-12 rounded-lg cursor-default transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-sm"
                      style={{
                        background: intensity === 0
                          ? isDark ? "rgba(2, 6, 23, 0.5)" : "rgba(241, 245, 249, 1)"
                          : `rgba(6, 182, 212, ${0.15 + intensity * 0.85})`
                      }}/>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-6">
                <span className={`text-xs font-bold ${sub}`}>{slicedDaily[0]?.date}</span>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isDark ? "bg-[#020617]/50 border border-cyan-900/30" : "bg-slate-50 border border-slate-200/50"}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Düşük</span>
                  {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
                    <div key={i} className="w-4 h-4 rounded-md shadow-inner" style={{ background: `rgba(6, 182, 212, ${o})` }}/>
                  ))}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Yüksek</span>
                </div>
                <span className={`text-xs font-bold ${sub}`}>{slicedDaily[slicedDaily.length - 1]?.date}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-500"}`}>
                <Zap size={32} strokeWidth={2.5}/>
              </div>
              <p className={`text-lg font-black mb-2 ${tx}`}>Veri Laboratuvarı Yüklenemedi</p>
              <p className={`text-sm font-medium mb-8 ${sub}`}>Bağlantıyı kontrol edip tekrar deneyin.</p>
              <button onClick={load} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white text-base font-black shadow-[0_10px_20px_-10px_rgba(6,182,212,0.5)] active:scale-95 transition-all duration-300">
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

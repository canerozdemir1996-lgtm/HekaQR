"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSupabaseSession";
import {
  Activity, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet,
  Globe, QrCode, Users, Loader2, RefreshCw, Calendar,
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
  plan_breakdown: Record<string, number>;
  subscription_breakdown: Record<string, number>;
  billing_breakdown: Record<string, number>;
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

function StatCard({ label, value, sub, icon, color, trend, isDark }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number;
  isDark?: boolean;
}) {
  const isDarkTheme = isDark ?? true;
  return (
    <div className={`group relative rounded-2xl border ${isDarkTheme ? "surface border-white/10 hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]" : "bg-white/80 border-slate-200/60 hover:bg-white hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5"} p-8 flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-black/5 dark:shadow-none overflow-hidden`}>
      
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
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${isDarkTheme ? "text-violet-100/50" : "text-slate-500"}`}>{label}</p>
        <p className={`text-5xl font-black ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{value}</p>
        {sub && <p className={`text-sm font-bold mt-2 ${isDarkTheme ? "text-violet-100/50" : "text-slate-500"}`}>{sub}</p>}
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
  const [isMounted, setIsMounted] = useState(false); // Yeni state

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

  useEffect(() => { setIsMounted(true); }, []); // Client tarafında mount olduğunda isMounted'ı true yap

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

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

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
    <div className={`px-6 py-8 space-y-6 ${!isMounted ? "opacity-0" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={`text-xl font-black tracking-tight ${tx}`}>Analitik</h1>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === r ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                {r}g
              </button>
            ))}
          </div>
          <button onClick={load}
              className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="animate-spin text-violet-400"/>
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

            {/* Plan Distribution */}
            {stats.plan_breakdown && (
              <div className={`rounded-2xl border ${card} p-5 animate-fade-in`} style={{ animationDelay: '150ms' }}>
                <h3 className={`text-sm font-black mb-4 ${tx}`}>Paket Dağılımı</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "free",       label: "Free",       dot: "#64748b", bg: isDark ? "bg-slate-500/10 border-slate-500/20" : "bg-slate-50 border-slate-200" },
                    { key: "starter",    label: "Starter",    dot: "#3b82f6", bg: isDark ? "bg-blue-500/10 border-blue-500/20"   : "bg-blue-50 border-blue-200"   },
                    { key: "pro",        label: "Pro",        dot: "#8b5cf6", bg: isDark ? "bg-violet-500/10 border-violet-500/20": "bg-violet-50 border-violet-200"},
                    { key: "enterprise", label: "Enterprise", dot: "#f59e0b", bg: isDark ? "bg-amber-500/10 border-amber-500/20"  : "bg-amber-50 border-amber-200"  },
                  ].map(p => {
                    const count = stats.plan_breakdown?.[p.key] ?? 0;
                    const pct = stats.total_users > 0 ? Math.round((count / stats.total_users) * 100) : 0;
                    return (
                      <div key={p.key} className={`rounded-xl border p-4 ${p.bg}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.dot }} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>{p.label}</span>
                        </div>
                        <p className={`text-3xl font-black ${tx}`}>{count}</p>
                        <p className={`text-[11px] mt-1 ${sub}`}>{pct}% · {stats.total_users} kullanıcı</p>
                        <div className={`mt-2 h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: p.dot }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  {/* Abonelik durumu */}
                  <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${sub}`}>Abonelik Durumu</p>
                    <div className="space-y-2">
                      {[
                        { k: "free",      label: "Ücretsiz", color: "#64748b" },
                        { k: "active",    label: "Aktif",    color: "#10b981" },
                        { k: "trial",     label: "Deneme",   color: "#f59e0b" },
                        { k: "expired",   label: "Süresi doldu", color: "#ef4444" },
                        { k: "cancelled", label: "İptal",    color: "#f43f5e" },
                      ].filter(s => (stats.subscription_breakdown?.[s.k] ?? 0) > 0).map(s => {
                        const cnt = stats.subscription_breakdown?.[s.k] ?? 0;
                        const pct = stats.total_users > 0 ? Math.round((cnt / stats.total_users) * 100) : 0;
                        return (
                          <div key={s.k} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className={`text-xs flex-1 ${sub}`}>{s.label}</span>
                            <span className={`text-xs font-black ${tx}`}>{cnt}</span>
                            <span className={`text-[10px] w-8 text-right ${sub}`}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Faturalandırma */}
                  <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${sub}`}>Faturalandırma Dönemi</p>
                    <div className="space-y-3">
                      {[
                        { k: "monthly", label: "Aylık",  color: "#3b82f6" },
                        { k: "yearly",  label: "Yıllık", color: "#8b5cf6" },
                      ].map(c => {
                        const cnt = stats.billing_breakdown?.[c.k] ?? 0;
                        const pct = stats.total_users > 0 ? Math.round((cnt / stats.total_users) * 100) : 0;
                        return (
                          <div key={c.k}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs ${sub}`}>{c.label}</span>
                              <span className={`text-xs font-black ${tx}`}>{cnt} <span className={`font-normal ${sub}`}>({pct}%)</span></span>
                            </div>
                            <div className={`h-2 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`}>
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main chart */}
            <div className={`rounded-[2.5rem] border ${card} p-6 sm:p-10 animate-fade-in`} style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className={`font-black text-2xl tracking-tight ${tx}`}>Etkileşim Yoğunluğu</h2>
                  <p className={`text-sm font-medium ${sub} mt-1`}>Son {range} gün · {totalInRange.toLocaleString("tr-TR")} toplam tarama</p>
                </div>
                <div className="flex items-center gap-4">
                  {peakDay && (
                    <div className={`text-right p-4 rounded-2xl ${isDark ? "surface-soft border border-violet-900/30" : "bg-slate-50 border border-slate-200/50"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Zirve Gün</p>
                      <p className={`text-xl font-black text-violet-600 dark:text-violet-400 leading-tight`}>{peakDay.count}</p>
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
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={compactDate} tick={{ fill: isDark ? "#475569" : "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: isDark ? "#475569" : "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} domain={[0, 'dataMax']} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(255, 255, 255, 0.9)",
                        border: isDark ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: '1.25rem',
                        color: isDark ? "#e2e8f0" : "#0f172a",
                        backdropFilter: "blur(20px)",
                        boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(139, 92, 246, 0.1)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: 700, marginBottom: '4px' }}
                      itemStyle={{ color: isDark ? "#22d3ee" : "#059669", fontSize: 16, fontWeight: 900 }}
                      formatter={(v: any) => [Number(v).toLocaleString("tr-TR"), ""]}
                      labelFormatter={(l: any) => String(l)}
                    />
                    <Area type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={4} fill="url(#gradScans)" animationDuration={1500} />
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
                      <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[1.5rem] border transition-all duration-300 group relative overflow-hidden ${isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-violet-900/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-1" : "bg-white/40 border-slate-200/50 hover:bg-white hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"}`}>
                        <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                        
                        <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-sm font-black shadow-inner transition-transform group-hover:scale-110 shrink-0 ${isDark ? (i < 3 ? "bg-amber-500/20 text-amber-400" : "bg-violet-950/50 text-violet-400") : (i < 3 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600")}`}>
                            {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-violet-400" : "text-slate-900 group-hover:text-violet-600"}`}>{qr.title}</p>
                            <p className={`text-[11px] font-mono mt-0.5 ${sub}`}>/q/{qr.short_slug}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:w-1/3 relative z-10">
                          <div className="flex-1">
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "surface-soft border border-violet-900/30" : "bg-slate-100"}`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-violet-500 relative transition-all duration-1000" style={{ width: `${pct}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}/>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 min-w-[60px]">
                            <span className="text-xl font-black text-violet-600 dark:text-violet-400">{qr.scan_count.toLocaleString("tr-TR")}</span>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Tarama</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stats.top_qr.length === 0 && (
                    <div className={`py-16 text-center rounded-[1.5rem] border border-dashed ${isDark ? "border-violet-900/30 surface-soft" : "border-slate-300 bg-slate-50"}`}>
                      <Eye size={32} className={`mx-auto mb-4 ${isDark ? "text-violet-900" : "text-slate-300"}`}/>
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
                            border: isDark ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
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
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Toplam</span>
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
                            border: isDark ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-500"}`}>
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
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "surface-soft border border-white/5" : "bg-slate-100"}`}>
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
                    { label: "Toplam Tarama (tüm zamanlar)", value: stats.total_scans.toLocaleString("tr-TR"), color: "#3b82f6" },
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-500"}`}>
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
                          : `rgba(139, 92, 246, ${0.15 + intensity * 0.85})`
                      }}/>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-6">
                <span className={`text-xs font-bold ${sub}`}>{slicedDaily[0]?.date}</span>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isDark ? "surface-soft border border-violet-900/30" : "bg-slate-50 border border-slate-200/50"}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Düşük</span>
                  {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
                    <div key={i} className="w-4 h-4 rounded-md shadow-inner" style={{ background: `rgba(139, 92, 246, ${o})` }}/>
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
              <button onClick={load} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-600 hover:from-emerald-400 hover:to-violet-500 text-white text-base font-black shadow-[0_10px_20px_-10px_rgba(139,92,246,0.5)] active:scale-95 transition-all duration-300">
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

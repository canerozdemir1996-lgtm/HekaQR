"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Activity, Globe, UserCog, Loader2, QrCode, LogIn,
  Pencil, Trash2, Plus, ShieldAlert, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import { useTheme } from "@/lib/theme";

interface AdminUserRow {
  id: string;
  email: string;
  role: "owner" | "admin" | "user";
  status: string;
  qrs: number;
}

interface AdminStats {
  total_users: number;
  total_qr: number;
  active_qr: number;
  total_scans: number;
  daily_scans: { date: string; count: number }[];
}

interface ActivityRow {
  id: string;
  action: string;
  resource: string;
  status: "success" | "failure";
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  signin: <LogIn size={13} />,
  create: <Plus size={13} />,
  update: <Pencil size={13} />,
  delete: <Trash2 size={13} />,
};

function compactDate(d: string) {
  try {
    const [, m, dd] = d.split("-");
    return `${dd}.${m}`;
  } catch {
    return d;
  }
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [metrics, setMetrics] = useState({ users: 0, qrs: 0, scans: 0 });
  const [usersList, setUsersList] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, statsRes, activityRes] = await Promise.all([
          fetch("/api/admin/users", { credentials: "same-origin" }),
          fetch("/api/admin/stats", { credentials: "same-origin" }),
          fetch("/api/admin/activity", { credentials: "same-origin" }),
        ]);
        const usersJson = await usersRes.json().catch(() => ({}));
        const statsJson = await statsRes.json().catch(() => ({}));
        const activityJson = await activityRes.json().catch(() => ({}));

        if (usersRes.ok) {
          setMetrics(usersJson.metrics);
          setUsersList(usersJson.usersList ?? []);
        }
        if (statsRes.ok) setStats(statsJson.stats ?? null);
        if (activityRes.ok) setActivity(activityJson.activity ?? []);
      } catch (error) {
        console.error("Admin fetch error", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  const kpis = [
    { label: "Toplam Kullanıcı", value: metrics.users, icon: <Users size={18} />, color: "#8b5cf6" },
    { label: "Üretilen QR Kod", value: (stats?.total_qr ?? metrics.qrs).toLocaleString("tr-TR"), icon: <QrCode size={18} />, color: "#10b981" },
    { label: "Aktif QR", value: stats?.active_qr ?? "—", icon: <Globe size={18} />, color: "#3b82f6" },
    { label: "Sistem Taraması", value: (stats?.total_scans ?? metrics.scans).toLocaleString("tr-TR"), icon: <Activity size={18} />, color: "#f59e0b" },
  ];

  const dailyChart = (stats?.daily_scans ?? []).sort((a, b) => a.date.localeCompare(b.date)).slice(-14).map((d) => ({ date: d.date, scans: d.count }));
  const dailyChartMax = Math.max(1, ...dailyChart.map((d) => d.scans));
  const yAxisTicks = Array.from({ length: 5 }, (_, i) => Math.round((dailyChartMax / 4) * i));

  return (
    <div className="px-6 py-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-black tracking-tight ${tx}`}>Genel Bakış</h1>
          <p className={`text-sm ${sub}`}>Sistem genelindeki tüm verileri yönetin.</p>
        </div>
        <button onClick={() => router.push("/admin/users")}
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all btn-premium focus-premium">
          <UserCog size={16} /> Kullanıcı Yönetimi
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <div key={i} className={`rounded-2xl border ${card} p-5 flex items-center gap-4`}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${s.color}18`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>{s.label}</p>
              <p className={`text-2xl font-black ${tx}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Trend chart */}
        <div className={`xl:col-span-2 rounded-2xl border ${card} p-6`}>
          <h3 className={`text-sm font-black mb-4 ${tx}`}>Son 14 Gün Tarama Trendi</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChart} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={compactDate} tick={{ fill: isDark ? "#64748b" : "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: isDark ? "#64748b" : "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={32} domain={[0, dailyChartMax]} ticks={yAxisTicks} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#0d1117" : "#fff",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 12, fontSize: 12,
                  }}
                  formatter={(v: any) => [Number(v).toLocaleString("tr-TR"), "Tarama"]}
                />
                <Area type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#dashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className={`rounded-2xl border ${card} overflow-hidden flex flex-col`}>
          <div className="px-5 py-4 border-b border-inherit flex items-center gap-2">
            <Clock size={14} className={sub} />
            <h3 className={`text-sm font-black ${tx}`}>Son Aktivite</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-inherit">
            {activity.length === 0 ? (
              <div className="py-10 text-center">
                <ShieldAlert size={24} className={`mx-auto mb-2 ${sub}`} />
                <p className={`text-xs ${sub}`}>Henüz aktivite yok</p>
              </div>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    a.status === "success"
                      ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                      : isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                  }`}>
                    {ACTION_ICON[a.action] ?? <Activity size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate ${tx}`}>
                      {a.user_name || a.user_email || "Bilinmeyen"}
                      <span className={`font-normal ${sub}`}> · {a.action} / {a.resource}</span>
                    </p>
                    <p className={`text-[10px] ${sub}`}>{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border ${card} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-inherit">
          <h3 className={`text-sm font-black ${tx}`}>Son Aktif Kullanıcılar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-[10px] font-black uppercase tracking-widest ${sub} ${isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
              <tr>
                <th className="px-6 py-3">Kullanıcı</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">QR Sayısı</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
              {usersList.map((u) => (
                <tr key={u.id} className={isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"}>
                  <td className={`px-6 py-3.5 font-medium ${tx}`}>{u.email}</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "owner" || u.role === "admin"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : isDark ? "bg-white/5 text-slate-400 border border-white/8" : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>{u.role}</span>
                  </td>
                  <td className={`px-6 py-3.5 font-mono ${sub}`}>{u.qrs}</td>
                  <td className="px-6 py-3.5">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${u.status === "Active" ? "text-emerald-500" : "text-red-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => router.push("/admin/users")}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:bg-slate-100"}`}>
                      Yönet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

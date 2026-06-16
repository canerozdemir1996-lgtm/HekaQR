"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Activity, Globe, UserCog, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface AdminUserRow {
  id: string;
  email: string;
  role: "owner" | "admin" | "user";
  status: string;
  qrs: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [metrics, setMetrics] = useState({ users: 0, qrs: 0, scans: 0 });
  const [usersList, setUsersList] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { credentials: "same-origin" });
        if (!res.ok) throw new Error("Kullanıcı verileri çekilemedi");
        const data = await res.json();
        setMetrics(data.metrics);
        setUsersList(data.usersList ?? []);
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

  const stats = [
    { label: "Toplam Kullanıcı", value: metrics.users, icon: <Users size={18} />, color: "#8b5cf6" },
    { label: "Üretilen QR Kod", value: metrics.qrs.toLocaleString("tr-TR"), icon: <Globe size={18} />, color: "#10b981" },
    { label: "Sistem Taraması", value: metrics.scans.toLocaleString("tr-TR"), icon: <Activity size={18} />, color: "#f59e0b" },
  ];

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
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

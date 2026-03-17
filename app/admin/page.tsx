"use client";
import { useTheme } from "@/lib/theme";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  Users, QrCode, BarChart2, Activity, TrendingUp, Shield,
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Check,
  AlertCircle, Search, LogOut, RefreshCw, Sun, Moon,
  Globe, Smartphone, Monitor, Hash, Home, ChevronRight,
  ArrowUpRight, List, Settings,
} from "lucide-react";

interface AppUser {
  id: string; email: string; full_name: string;
  role: "admin" | "user"; is_active: boolean;
  created_at: string; last_sign_in?: string;
  qr_count: number; scan_count: number;
}

interface AdminStats {
  total_users: number; total_qr: number;
  total_scans: number; active_qr: number;
  daily_scans: { date: string; count: number }[];
  top_qr: { title: string; short_slug: string; scan_count: number }[];
  device_breakdown: { device: string; count: number }[];
  country_breakdown: { country: string; count: number }[];
}

// ── User Modal ────────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved, isDark }: {
  user: AppUser | null; onClose: () => void; onSaved: () => void; isDark: boolean;
}) {
  const isNew = !user;
  const [email, setEmail] = useState(user?.email ?? "");
  const [name,  setName]  = useState(user?.full_name ?? "");
  const [role,  setRole]  = useState<"admin"|"user">(user?.role ?? "user");
  const [pw,    setPw]    = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const save = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, email, full_name: name, role, password: pw || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  };

  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Users size={15} className="text-white"/>
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                {isNew ? "Yeni Kullanıcı" : "Kullanıcı Düzenle"}
              </h2>
              <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {isNew ? "Sisteme yeni kullanıcı ekle" : user?.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={14}/>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
            <AlertCircle size={12}/> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Ad Soyad</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad"
              className={`w-full mt-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${inp}`}/>
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="kullanici@ornek.com" disabled={!isNew}
              className={`w-full mt-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${inp} disabled:opacity-40`}/>
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {isNew ? "Şifre" : "Yeni Şifre (boş = değişmez)"}
            </label>
            <div className="relative mt-1">
              <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                placeholder={isNew ? "••••••••" : "Değiştirmek için girin"}
                className={`w-full border rounded-xl px-3 py-2.5 pr-9 text-sm outline-none transition-all ${inp}`}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400"}`}>
                {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rol</label>
            <div className="flex gap-2 mt-1">
              {(["user","admin"] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    role === r
                      ? "border-violet-500 bg-violet-500/15 text-violet-400"
                      : isDark ? "border-white/10 text-slate-500 hover:border-white/20" : "border-slate-200 text-slate-400"
                  }`}>
                  {r === "admin" ? "Admin" : "Kullanıcı"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-white/20" : "border-slate-200 text-slate-500"}`}>
            İptal
          </button>
          <button onClick={save} disabled={loading || !email.trim() || (isNew && !pw.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
            {isNew ? "Oluştur" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [tab, setTab]           = useState<"overview"|"users"|"qrcodes"|"analytics">("overview");
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [qrList, setQrList]     = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [editUser, setEditUser] = useState<AppUser | null | "new">(null);
  const [currentUser, setCurrentUser] = useState<{email:string;role:string}|null>(null);

  const authChecked = useRef(false);
  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;
    try {
      getSupabase().auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        const role = session.user.user_metadata?.role;
        if (role !== "admin") { window.location.href = "/dashboard"; return; }
        setCurrentUser({ email: session.user.email ?? "", role });
      }).catch(() => { window.location.href = "/login"; });
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, qrRes] = await Promise.all([
        fetch("/api/admin/users").then(r => r.json()),
        fetch("/api/admin/stats").then(r => r.json()),
        fetch("/api/admin/qrcodes").then(r => r.json()),
      ]);
      setUsers(usersRes.users ?? []);
      setStats(statsRes.stats ?? null);
      setQrList(qrRes.qrcodes ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    router.push("/login");
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    load();
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Theme tokens
  const pg      = isDark ? "bg-[#080b14]" : "bg-[#f4f6f9]";
  const sidebar  = isDark ? "bg-[#0c0f1a] border-slate-800" : "bg-white border-slate-200";
  const topbar   = isDark ? "bg-[#0c0f1a]/95 border-slate-800" : "bg-white/95 border-slate-200";
  const card     = isDark ? "bg-[#0c0f1a] border-slate-800" : "bg-white border-slate-200";
  const tx       = isDark ? "text-slate-100" : "text-slate-900";
  const sub      = isDark ? "text-slate-500" : "text-slate-400";
  const rowHover = isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50";
  const rowBdr   = isDark ? "border-slate-800/60" : "border-slate-100";
  const thCls    = `text-[10px] font-black uppercase tracking-widest ${sub}`;
  const inputCls = isDark
    ? "bg-white/5 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500"
    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400";

  const navItems = [
    { id: "overview"  as const, label: "Genel Bakış",  icon: <Home size={15}/>,      href: null },
    { id: "users"     as const, label: "Kullanıcılar", icon: <Users size={15}/>,     href: "/admin/users" },
    { id: "qrcodes"   as const, label: "QR Kodlar",    icon: <QrCode size={15}/>,    href: null },
    { id: "analytics" as const, label: "Analizler",    icon: <BarChart2 size={15}/>, href: "/admin/analytics" },
  ];

  const statCards = stats ? [
    { label: "Kullanıcılar", value: stats.total_users, icon: <Users size={16}/>, color: "#7c3aed" },
    { label: "Toplam QR", value: stats.total_qr, icon: <QrCode size={16}/>, sub: `${stats.active_qr} aktif`, color: "#3b82f6" },
    { label: "Toplam Tarama", value: stats.total_scans.toLocaleString("tr-TR"), icon: <Activity size={16}/>, color: "#10b981" },
    { label: "Günlük Ort.", value: stats.daily_scans.length ? Math.round(stats.daily_scans.slice(-7).reduce((a,b) => a+b.count,0)/7) : 0, icon: <TrendingUp size={16}/>, sub: "son 7 gün", color: "#f59e0b" },
  ] : [];

  return (
    <div className={`min-h-screen ${pg} flex flex-col`}>

      {/* ── TOP BAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b ${topbar} backdrop-blur-xl`}>
        {/* Logo */}
        <div className="flex items-center gap-3 w-56 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <QrCode size={15} className="text-white"/>
          </div>
          <span className={`font-black text-base tracking-tight ${tx}`}>
            QR<span className="text-violet-500">Hub</span>
          </span>
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-violet-500/15 text-violet-400 rounded-full border border-violet-500/25">
            Admin
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <span className={`text-xs hidden sm:block ${sub}`}>{currentUser.email}</span>
          )}
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:text-yellow-400" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${isDark ? "border-slate-700 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:text-slate-800"}`}>
            <Home size={12}/> Dashboard
          </button>
          <button onClick={handleLogout}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-900/40" : "border-slate-200 text-slate-400 hover:text-red-500"}`}>
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      <div className="flex pt-14 flex-1">

        {/* ── SIDEBAR ── */}
        <aside className={`fixed left-0 top-14 bottom-0 w-56 border-r ${sidebar} flex flex-col z-30`}>
          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5">
            <p className={`text-[9px] font-black tracking-widest px-2 mb-2 mt-1 ${sub}`}>YÖNETİM</p>
            {navItems.map(item => (
              <button key={item.id}
                onClick={() => item.href ? router.push(item.href) : setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  tab === item.id && !item.href
                    ? "bg-violet-600 text-white font-semibold shadow-sm"
                    : isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}>
                {item.icon}
                <span>{item.label}</span>
                {item.id === "users" && users.length > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === item.id ? "bg-white/20 text-white" : isDark ? "bg-white/10 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
                    {users.length}
                  </span>
                )}
              </button>
            ))}

            <div className={`h-px my-3 ${isDark ? "bg-slate-800" : "bg-slate-200"}`}/>
            <p className={`text-[9px] font-black tracking-widest px-2 mb-2 ${sub}`}>İŞLEMLER</p>
            <button onClick={() => setEditUser("new")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
              <Plus size={15}/> Kullanıcı Ekle
            </button>
            <button onClick={load}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Yenile
            </button>
          </nav>

          {/* Current user */}
          <div className={`p-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-black">{(currentUser?.email[0] ?? "A").toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold truncate ${tx}`}>{currentUser?.email ?? "Admin"}</p>
                <p className={`text-[9px] ${sub}`}>Sistem Yöneticisi</p>
              </div>
              <Shield size={12} className="text-violet-400 shrink-0"/>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="ml-56 flex-1 p-6 space-y-5">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div>
                <h1 className={`text-xl font-black ${tx}`}>Genel Bakış</h1>
                <p className={`text-sm ${sub} mt-0.5`}>Sistem durumu ve özet istatistikler</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-violet-400"/></div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {statCards.map(s => (
                      <div key={s.label} className={`rounded-2xl border ${card} p-4 flex items-center gap-3`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18`, color: s.color }}>
                          {s.icon}
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>{s.label}</p>
                          <p className={`text-2xl font-black ${tx}`}>{s.value}</p>
                          {s.sub && <p className={`text-[10px] ${sub}`}>{s.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Top QR */}
                      <div className={`lg:col-span-2 rounded-2xl border ${card} p-5`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>En Çok Taranan QR Kodlar</h3>
                        <div className="space-y-3">
                          {stats.top_qr.slice(0, 8).map((qr, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className={`text-[10px] font-black w-5 text-center ${sub}`}>{i+1}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${tx}`}>{qr.title}</p>
                                <p className={`text-[10px] font-mono ${sub}`}>/q/{qr.short_slug}</p>
                              </div>
                              <span className="text-sm font-black text-violet-400">{qr.scan_count.toLocaleString("tr-TR")}</span>
                              <ArrowUpRight size={12} className={sub}/>
                            </div>
                          ))}
                          {stats.top_qr.length === 0 && <p className={`text-sm ${sub} text-center py-6`}>Henüz tarama yok</p>}
                        </div>
                      </div>

                      {/* Device + Country */}
                      <div className="space-y-4">
                        <div className={`rounded-2xl border ${card} p-4`}>
                          <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-3`}>Cihaz Dağılımı</h3>
                          {stats.device_breakdown.slice(0, 4).map((d, i) => {
                            const total = stats.device_breakdown.reduce((a,b) => a+b.count, 0) || 1;
                            const pct = Math.round((d.count/total)*100);
                            return (
                              <div key={i} className="mb-3 last:mb-0">
                                <div className="flex justify-between text-xs mb-1.5">
                                  <span className={`flex items-center gap-1.5 ${tx}`}>
                                    {d.device === "mobile" ? <Smartphone size={11}/> : <Monitor size={11}/>}
                                    <span className="capitalize">{d.device || "Diğer"}</span>
                                  </span>
                                  <span className={sub}>{pct}%</span>
                                </div>
                                <div className={`h-1.5 rounded-full ${isDark ? "bg-white/[0.07]" : "bg-slate-200"}`}>
                                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{width:`${pct}%`}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className={`rounded-2xl border ${card} p-4`}>
                          <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-3`}>Ülke</h3>
                          {stats.country_breakdown.slice(0, 5).map((c, i) => (
                            <div key={i} className={`flex items-center gap-2 py-1.5 ${i > 0 ? `border-t ${isDark ? "border-slate-800" : "border-slate-100"}` : ""}`}>
                              <Globe size={10} className={sub}/>
                              <span className={`text-xs flex-1 ${tx}`}>{c.country || "Bilinmiyor"}</span>
                              <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily chart */}
                  {stats && stats.daily_scans.length > 0 && (
                    <div className={`rounded-2xl border ${card} p-5`}>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>Günlük Taramalar — Son 30 Gün</h3>
                      <div className="flex items-end gap-1 h-20">
                        {stats.daily_scans.slice(-30).map((d, i) => {
                          const max = Math.max(...stats.daily_scans.map(x => x.count), 1);
                          const h = Math.round((d.count/max)*100);
                          return (
                            <div key={i} title={`${d.date}: ${d.count}`}
                              className="flex-1 rounded-t-sm transition-opacity hover:opacity-100 opacity-80 cursor-default"
                              style={{ height: `${Math.max(h,2)}%`, background: "linear-gradient(to top,#7c3aed,#818cf8)" }}/>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className={`text-[9px] ${sub}`}>{stats.daily_scans[0]?.date}</span>
                        <span className={`text-[9px] ${sub}`}>{stats.daily_scans[stats.daily_scans.length-1]?.date}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className={`text-xl font-black ${tx}`}>Kullanıcılar</h1>
                  <p className={`text-sm ${sub}`}>{users.length} kayıtlı kullanıcı</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kullanıcı ara…"
                      className={`pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all ${inputCls}`}/>
                  </div>
                  <button onClick={() => setEditUser("new")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/20">
                    <Plus size={14}/> Kullanıcı Ekle
                  </button>
                </div>
              </div>

              <div className={`rounded-2xl border ${card} overflow-hidden`}>
                {/* Header */}
                <div className={`hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b ${isDark ? "bg-white/[0.02] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div className={`col-span-4 ${thCls}`}>Kullanıcı</div>
                  <div className={`col-span-2 ${thCls}`}>Rol</div>
                  <div className={`col-span-1 ${thCls}`}>QR</div>
                  <div className={`col-span-2 ${thCls}`}>Tarama</div>
                  <div className={`col-span-2 ${thCls}`}>Son Giriş</div>
                  <div className={`col-span-1 ${thCls} text-right`}>İşlem</div>
                </div>
                {filteredUsers.map(u => (
                  <div key={u.id} className={`grid grid-cols-12 gap-2 px-5 py-3.5 border-b ${rowBdr} ${rowHover} transition-colors items-center last:border-0`}>
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className={`text-[11px] font-black text-violet-400`}>{(u.full_name?.[0] || u.email?.[0] || "U").toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${tx}`}>{u.full_name || "—"}</p>
                        <p className={`text-[11px] truncate ${sub}`}>{u.email}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${u.role === "admin" ? "bg-violet-500/15 text-violet-400 border border-violet-500/25" : isDark ? "bg-white/5 text-slate-500 border border-white/8" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className={`col-span-1 text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{u.qr_count}</div>
                    <div className={`col-span-2 text-sm font-bold text-violet-400`}>{u.scan_count.toLocaleString("tr-TR")}</div>
                    <div className={`col-span-2 text-xs ${sub}`}>
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("tr-TR") : "Hiç girmedi"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)}
                        className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-violet-400 hover:bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"}`}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)}
                        className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="py-16 text-center">
                    <Users size={28} className={`mx-auto mb-2 ${sub}`}/>
                    <p className={`text-sm ${sub}`}>Kullanıcı bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── QR CODES ── */}
          {tab === "qrcodes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className={`text-xl font-black ${tx}`}>QR Kodlar</h1>
                  <p className={`text-sm ${sub}`}>Sistemdeki tüm QR kodları</p>
                </div>
                <div className="relative">
                  <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="QR kod ara…"
                    className={`pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all ${inputCls}`}/>
                </div>
              </div>

              <div className={`rounded-2xl border ${card} overflow-hidden`}>
                <div className={`hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b ${isDark ? "bg-white/[0.02] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div className={`col-span-4 ${thCls}`}>Başlık / Slug</div>
                  <div className={`col-span-2 ${thCls}`}>Tür</div>
                  <div className={`col-span-3 ${thCls}`}>Kullanıcı</div>
                  <div className={`col-span-1 ${thCls}`}>Tarama</div>
                  <div className={`col-span-1 ${thCls}`}>Tarih</div>
                  <div className={`col-span-1 ${thCls}`}>Durum</div>
                </div>
                {qrList
                  .filter((q: Record<string,unknown>) => !search || (q.title as string).toLowerCase().includes(search.toLowerCase()))
                  .map((q: Record<string,unknown>, i) => (
                    <div key={i} className={`grid grid-cols-12 gap-2 px-5 py-3 border-b ${rowBdr} ${rowHover} transition-colors items-center last:border-0`}>
                      <div className="col-span-4">
                        <p className={`text-sm font-semibold truncate ${tx}`}>{q.title as string}</p>
                        <p className={`text-[10px] font-mono ${sub}`}>/q/{q.short_slug as string}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                          {q.qr_type as string}
                        </span>
                      </div>
                      <div className={`col-span-3 text-xs truncate ${sub}`}>{(q.user_email as string) || "—"}</div>
                      <div className="col-span-1 text-sm font-bold text-violet-400">{(q.scan_count as number)?.toLocaleString("tr-TR")}</div>
                      <div className={`col-span-1 text-[11px] ${sub}`}>
                        {q.created_at ? new Date(q.created_at as string).toLocaleDateString("tr-TR", {day:"2-digit",month:"short"}) : "—"}
                      </div>
                      <div className="col-span-1">
                        <span className={`w-2 h-2 rounded-full inline-block ${q.is_active ? "bg-emerald-400" : "bg-red-500"}`}/>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {tab === "analytics" && stats && (
            <div className="space-y-5">
              <div>
                <h1 className={`text-xl font-black ${tx}`}>Analizler</h1>
                <p className={`text-sm ${sub}`}>Platform geneli istatistikler</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Trend */}
                <div className={`lg:col-span-2 rounded-2xl border ${card} p-5`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>Günlük Tarama Trendi</h3>
                  <div className="flex items-end gap-1 h-28">
                    {stats.daily_scans.slice(-30).map((d, i) => {
                      const max = Math.max(...stats.daily_scans.map(x => x.count), 1);
                      const h = Math.round((d.count/max)*100);
                      return (
                        <div key={i} className="flex-1 rounded-t-sm cursor-default hover:opacity-100 opacity-75 transition-opacity"
                          title={`${d.date}: ${d.count}`}
                          style={{ height: `${Math.max(h,2)}%`, background: "linear-gradient(to top,#7c3aed,#a78bfa)" }}/>
                      );
                    })}
                  </div>
                </div>

                {/* QR type breakdown */}
                <div className={`rounded-2xl border ${card} p-5`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>QR Tip Dağılımı</h3>
                  {Object.entries(
                    qrList.reduce((acc: Record<string,number>, q: Record<string,unknown>) => {
                      const t = (q.qr_type as string) || "url";
                      acc[t] = (acc[t]||0) + 1; return acc;
                    }, {})
                  ).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([type, count]) => {
                    const total = qrList.length || 1;
                    return (
                      <div key={type} className="flex items-center gap-2 mb-3 last:mb-0">
                        <Hash size={9} className="text-violet-400 shrink-0"/>
                        <span className={`text-xs flex-1 capitalize ${tx}`}>{type}</span>
                        <div className={`w-16 h-1.5 rounded-full ${isDark ? "bg-white/[0.07]" : "bg-slate-200"}`}>
                          <div className="h-full bg-violet-500 rounded-full" style={{width:`${Math.round((count/total)*100)}%`}}/>
                        </div>
                        <span className={`text-[10px] font-bold w-4 text-right ${isDark ? "text-slate-400" : "text-slate-600"}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User perf */}
              <div className={`rounded-2xl border ${card} p-5`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>Kullanıcı Performansı</h3>
                <div className="space-y-1">
                  {[...users].sort((a,b) => b.scan_count - a.scan_count).slice(0, 10).map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-3 py-2.5 border-b ${rowBdr} last:border-0`}>
                      <span className={`text-[10px] font-black w-5 text-center ${sub}`}>{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${tx}`}>{u.full_name || u.email}</p>
                        <p className={`text-[10px] ${sub}`}>{u.qr_count} QR</p>
                      </div>
                      <span className="text-sm font-black text-violet-400">{u.scan_count.toLocaleString("tr-TR")}</span>
                      <span className={`text-[10px] ${sub}`}>tarama</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Modal */}
      {editUser !== null && (
        <UserModal
          user={editUser === "new" ? null : editUser}
          isDark={isDark}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); }}
        />
      )}
    </div>
  );
}

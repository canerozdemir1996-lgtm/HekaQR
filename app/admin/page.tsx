"use client";
import { useTheme } from "@/lib/theme";
import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProfileMenu } from "@/components/ProfileMenu";
import {
  Users, QrCode, BarChart2, Activity, TrendingUp, Shield,
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Check,
  AlertCircle, Search, LogOut, RefreshCw, Sun, Moon,
  Globe, Smartphone, Monitor, Hash, Home, ChevronRight,
  ArrowUpRight, List, Settings, Mail,
} from "lucide-react";
import dynamic from "next/dynamic";

const Admin3DScene = dynamic(() => import("@/components/Admin3DScene"), { ssr: false });

interface AppUser {
  id: string; email: string; full_name: string;
  role: "owner" | "admin" | "user"; is_active: boolean;
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

interface AdminQrItem {
  id: string;
  title: string;
  short_slug: string;
  qr_type: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  user_id: string | null;
  user_email?: string;
}

// ── User Modal ────────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved, isDark, actorRole }: {
  user: AppUser | null; onClose: () => void; onSaved: () => void; isDark: boolean;
  actorRole: "owner" | "admin";
}) {
  const isNew = !user;
  const [email, setEmail] = useState(user?.email ?? "");
  const [name,  setName]  = useState(user?.full_name ?? "");
  const [role,  setRole]  = useState<"owner"|"admin"|"user">(user?.role ?? "user");
  const [pw,    setPw]    = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const OWNER_ROLE_OPTIONS = ["user", "admin", "owner"] as const;
  const ADMIN_ROLE_OPTIONS = ["user", "admin"] as const;
  const roleOptions = actorRole === "owner" ? OWNER_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;

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
    ? "bg-[#020617]/50 border-cyan-900/40 text-cyan-50 placeholder:text-cyan-800/50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:bg-white transition-all duration-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-md rounded-[2rem] border shadow-2xl p-7 animate-scale-in transition-colors duration-300 ${isDark ? "bg-[#0b1121]/95 border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.1)]" : "bg-white/95 border-slate-200/60 shadow-xl"} backdrop-blur-3xl`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users size={18} className="text-white"/>
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
              {isNew ? "Geçici Şifre" : "Yeni Şifre (boş = değişmez)"}
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
            {isNew && (
              <p className={`text-[11px] mt-2 ${isDark ? "text-slate-600" : "text-slate-500"}`}>
                Kullanıcının <b>e-postasını doğrulaması</b> ve ilk girişte <b>şifreyi değiştirmesi</b> zorunludur.
              </p>
            )}
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rol</label>
            <div className="flex gap-2 mt-1">
              {roleOptions.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    role === r
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : isDark ? "border-cyan-900/30 text-slate-500 hover:border-cyan-700/50 hover:text-slate-300 bg-[#020617]/50" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}>
                  {r === "admin" ? "Admin" : r === "owner" ? "Owner" : "Kullanıcı"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? "border-cyan-900/30 bg-[#020617]/50 text-slate-400 hover:border-cyan-700/50 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            İptal
          </button>
          <button onClick={save} disabled={loading || !email.trim() || (isNew && !pw.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95">
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
  const { data: session, status } = useSession();

  type AdminTabId = "overview" | "users" | "qrcodes" | "analytics";
  type AdminNavItem =
    | { id: AdminTabId; label: string; icon: ReactNode; href: null }
    | { id: string; label: string; icon: ReactNode; href: string };

  const [tab, setTab]           = useState<AdminTabId>("overview");
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [qrList, setQrList]     = useState<AdminQrItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [editUser, setEditUser] = useState<AppUser | null | "new">(null);
  const [currentUser, setCurrentUser] = useState<{email:string;role:"admin"|"owner"}|null>(null);

  // ─── Permission Check ─────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return; // Wait for session to load

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    const role = (session?.user.role as "admin" | "owner" | "user" | undefined)      || (session?.user as any)?.raw_user_meta_data?.role      || (session?.user as any)?.user_metadata?.role
      || "user";

    if (role !== "admin" && role !== "owner") {
      router.replace("/404");
      return;
    }

    // Set current user for display
    if (session?.user) {
      setCurrentUser({
        email: session.user.email || "",
        role: (role as "admin" | "owner")
      });
    }
  }, [router, session, status]);

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
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: true, callbackUrl: "/login" });
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

  // Theme tokens (premium)
  const pg       = "relative z-10 flex-1 flex flex-col";
  const sidebar  = isDark ? "bg-[#0b1121]/80 border-cyan-900/30 supports-[backdrop-filter]:bg-[#0b1121]/40" : "bg-white/80 border-slate-200/60 supports-[backdrop-filter]:bg-white/40";
  const topbar   = isDark ? "bg-[#0b1121]/80 border-cyan-900/30 supports-[backdrop-filter]:bg-[#0b1121]/40" : "bg-white/80 border-slate-200/60 supports-[backdrop-filter]:bg-white/40";
  const card     = isDark ? "bg-[#0b1121]/60 border-cyan-900/30 shadow-lg shadow-black/20 backdrop-blur-xl hover:bg-[#0b1121]/80 hover:border-cyan-700/50 transition-all duration-500" : "bg-white/60 border-slate-200/60 shadow-xl shadow-slate-200/40 backdrop-blur-xl hover:bg-white hover:border-slate-300 transition-all duration-500";
  const tx       = isDark ? "text-white" : "text-slate-900";
  const sub      = isDark ? "text-cyan-100/50" : "text-slate-500";
  const rowHover = isDark ? "hover:bg-cyan-950/20 hover:border-cyan-800/30 transition-all duration-300" : "hover:bg-slate-50 hover:border-slate-300/50 transition-all duration-300";
  const rowBdr   = isDark ? "border-cyan-900/20" : "border-slate-100";
  const thCls    = `text-[10px] font-bold uppercase tracking-[0.15em] ${isDark ? "text-cyan-400" : "text-slate-500"}`;
  const inputCls = isDark
    ? "bg-[#020617]/50 border-cyan-900/40 text-cyan-50 placeholder:text-cyan-800/50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
    : "bg-white/50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all duration-300";

  const navItems: AdminNavItem[] = [
    { id: "overview"  as const, label: "Genel Bakış",  icon: <Home size={15}/>,      href: null },
    { id: "users"     as const, label: "Kullanıcılar", icon: <Users size={15}/>,     href: "/admin/users" },
    ...(currentUser?.role === "owner"
      ? [{ id: "messages" as const, label: "Mesajlar", icon: <Mail size={15}/>, href: "/admin/messages" }]
      : []),
    { id: "qrcodes"   as const, label: "QR Kodlar",    icon: <QrCode size={15}/>,    href: null },
    { id: "analytics" as const, label: "Analizler",    icon: <BarChart2 size={15}/>, href: "/admin/analytics" },
  ];

  const statCards = stats ? [
    { label: "Kullanıcılar", value: stats.total_users, icon: <Users size={28}/>, text: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]" },
    { label: "Toplam QR", value: stats.total_qr, icon: <QrCode size={28}/>, sub: `${stats.active_qr} aktif`, text: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]" },
    { label: "Toplam Tarama", value: stats.total_scans.toLocaleString("tr-TR"), icon: <Activity size={28}/>, text: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]" },
    { label: "Günlük Ort.", value: stats.daily_scans.length ? Math.round(stats.daily_scans.slice(-7).reduce((a,b) => a+b.count,0)/7) : 0, icon: <TrendingUp size={28}/>, sub: "son 7 gün", text: "text-rose-500 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "hover:border-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]" },
  ] : [];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200 transition-colors duration-500 selection:bg-cyan-500/30 selection:text-cyan-200`}>
      {/* Mission Control Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 opacity-40 mix-blend-screen">
            <Admin3DScene />
          </div>
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
      </div>
      
      {/* Mission Control Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.04]" 
           style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className={`${pg}`}>

      {/* ── COMMAND CENTER TOP BAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b ${topbar} backdrop-blur-2xl shadow-sm shadow-cyan-900/5`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 w-56 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Shield size={16} className="text-white"/>
          </div>
          <span className={`font-black text-base tracking-tight ${tx}`}>
            Heka<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Admin</span>
          </span>
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            SYSTEM
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-cyan-900/50 bg-[#020617]/50 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${isDark ? "border-cyan-900/50 bg-[#020617]/50 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <Home size={12}/> Dashboard
          </button>
          <ProfileMenu email={currentUser?.email ?? ""} role={currentUser?.role} isDark={isDark} onLogout={handleLogout} />
        </div>
      </header>

      <div className="flex pt-14 flex-1">

        {/* ── SIDEBAR ── */}
        <aside className={`fixed left-0 top-14 bottom-0 w-56 border-r ${sidebar} flex flex-col z-30 backdrop-blur-2xl`}>
          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5">
            <p className={`text-[9px] font-black tracking-widest px-2 mb-2 mt-1 ${sub}`}>YÖNETİM</p>
            {navItems.map(item => (
              <button key={item.id}
                onClick={() => {
                  if (item.href !== null) router.push(item.href);
                  else setTab(item.id);
                }}
            className={`group w-full flex items-center gap-3 px-4 py-3.5 mb-1.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  tab === item.id && !item.href
                ? "bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-[0_10px_20px_-5px_rgba(16,185,129,0.5)] hover:scale-[1.02]"
                : isDark ? "text-slate-400 hover:bg-cyan-950/30 hover:text-cyan-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}>
                <div className={`${tab === item.id && !item.href ? "scale-110" : "opacity-70 group-hover:opacity-100"} transition-transform`}>{item.icon}</div>
                <span>{item.label}</span>
                {item.id === "users" && users.length > 0 && (
              <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full shadow-inner ${tab === item.id ? "bg-white/20 text-white" : isDark ? "bg-[#020617] border border-cyan-900/30 text-slate-400" : "bg-white border border-slate-200 text-slate-500"}`}>
                    {users.length}
                  </span>
                )}
              </button>
            ))}

            <div className={`h-px my-3 ${isDark ? "bg-slate-800" : "bg-slate-200"}`}/>
            <p className={`text-[9px] font-black tracking-widest px-2 mb-2 ${sub}`}>İŞLEMLER</p>
            <button onClick={() => setEditUser("new")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? "text-slate-400 hover:bg-cyan-950/30 hover:text-cyan-200" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-800"}`}>
              <Plus size={15}/> Kullanıcı Ekle
            </button>
            <button onClick={load}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? "text-slate-400 hover:bg-cyan-950/30 hover:text-cyan-200" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-800"}`}>
            <RefreshCw size={15} className={loading ? "animate-spin text-cyan-500" : ""}/> Yenile
            </button>
          </nav>

          {/* Current user */}
        <div className={`p-3 border-t ${isDark ? "border-cyan-900/30" : "border-slate-200/60"}`}>
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-transparent transition-all ${isDark ? "bg-[#020617]/50 hover:border-cyan-900/30" : "bg-slate-50/50 hover:border-slate-200"}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-[10px] font-black">{(currentUser?.email[0] ?? "A").toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold truncate ${tx}`}>{currentUser?.email ?? "Admin"}</p>
              <p className={`text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider`}>{currentUser?.role}</p>
              </div>
            <Shield size={14} className="text-cyan-500 shrink-0"/>
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
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-cyan-500"/></div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map(s => (
                      <div key={s.label} className={`group relative rounded-[2.5rem] border ${isDark ? "bg-[#0b1121]/60 border-cyan-900/30" : "bg-white/80 border-slate-200/60"} p-8 flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-black/5 dark:shadow-none ${s.border}`}>
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 ${s.bg} ${s.text} shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${sub}`}>{s.label}</p>
                          <p className={`text-5xl font-black ${tx}`}>{s.value}</p>
                          {s.sub && <p className={`text-sm font-bold mt-2 ${sub}`}>{s.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Top QR */}
                      <div className={`lg:col-span-2 rounded-2xl border ${card} p-5`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>En Çok Taranan QR Kodlar</h3>
                        <div className="space-y-4">
                          {stats.top_qr.slice(0, 8).map((qr, i) => (
                            <div key={i} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 group ${isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-cyan-900/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-1" : "bg-white/40 border-slate-200/50 hover:bg-white hover:border-cyan-300 hover:shadow-xl hover:-translate-y-1"}`}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner transition-transform group-hover:scale-110 ${isDark ? "bg-cyan-950/50 text-cyan-400" : "bg-slate-100 text-slate-600"}`}>{i+1}</div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}`}>{qr.title}</p>
                                <p className={`text-xs font-mono mt-0.5 ${sub}`}>/q/{qr.short_slug}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{qr.scan_count.toLocaleString("tr-TR")}</span>
                                <p className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Tarama</p>
                              </div>
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
                              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-[#020617] border border-cyan-900/20" : "bg-slate-100"}`}>
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 relative" style={{width:`${pct}%`}}>
                                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}/>
                                </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className={`rounded-2xl border ${card} p-4`}>
                          <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-3`}>Ülke</h3>
                          {stats.country_breakdown.slice(0, 5).map((c, i) => (
                          <div key={i} className={`flex items-center gap-2 py-1.5 ${i > 0 ? `border-t ${isDark ? "border-cyan-900/20" : "border-slate-100"}` : ""}`}>
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
                            className="flex-1 rounded-t-sm transition-all hover:opacity-100 opacity-70 hover:brightness-125 cursor-default"
                            style={{ height: `${Math.max(h,2)}%`, background: "linear-gradient(to top, #0d9488, #10b981)" }}/>
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95">
                  <Plus size={15} strokeWidth={3}/> Kullanıcı Ekle
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Header */}
              <div className={`hidden md:grid grid-cols-12 gap-4 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${isDark ? "text-cyan-500 bg-cyan-950/30 border border-cyan-900/30" : "text-slate-500 bg-slate-100 border border-slate-200/60"}`}>
                  <div className={`col-span-4 ${thCls}`}>Kullanıcı</div>
                  <div className={`col-span-2 ${thCls}`}>Rol</div>
                  <div className={`col-span-1 ${thCls}`}>QR</div>
                  <div className={`col-span-2 ${thCls}`}>Tarama</div>
                  <div className={`col-span-2 ${thCls}`}>Son Giriş</div>
                  <div className={`col-span-1 ${thCls} text-right`}>İşlem</div>
                </div>
                {filteredUsers.map(u => (
                  <div key={u.id} className={`grid grid-cols-12 gap-4 px-8 py-5 rounded-[1.5rem] border transition-all duration-400 items-center group relative overflow-hidden
                    ${isDark ? "bg-[#0b1121]/60 border-cyan-900/30 hover:border-cyan-500/50 hover:bg-[#0b1121]/90 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1" : "bg-white/80 border-slate-200/60 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"}`}>
                    
                    {/* Shine effect */}
                    <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />

                    <div className="col-span-4 flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-slate-100 dark:bg-[#020617] border border-slate-200 dark:border-cyan-900/30 shadow-inner flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className={`text-lg font-black text-cyan-600 dark:text-cyan-400`}>{(u.full_name?.[0] || u.email?.[0] || "U").toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}`}>{u.full_name || "—"}</p>
                        <p className={`text-[11px] truncate ${sub}`}>{u.email}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${
                        (u.role === "admin" || u.role === "owner")
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        : isDark ? "bg-[#020617] text-slate-400 border border-cyan-900/30" : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {u.role === "owner" ? "Owner" : u.role === "admin" ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className={`col-span-1 text-base font-bold relative z-10 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{u.qr_count}</div>
                  <div className={`col-span-2 text-xl font-black text-cyan-600 dark:text-cyan-400 relative z-10`}>{u.scan_count.toLocaleString("tr-TR")}</div>
                    <div className={`col-span-2 text-xs font-medium relative z-10 ${sub}`}>
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("tr-TR") : "Hiç girmedi"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2 relative z-10">
                      <button onClick={() => setEditUser(u)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDark ? "bg-[#020617] text-slate-500 hover:text-cyan-400 hover:bg-cyan-900/50" : "bg-white text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 shadow-sm"}`}>
                        <Pencil size={16}/>
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDark ? "bg-[#020617] text-slate-600 hover:text-rose-400 hover:bg-rose-500/20" : "bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm"}`}>
                        <Trash2 size={16}/>
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

              <div className="space-y-4">
                <div className={`hidden md:grid grid-cols-12 gap-4 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${isDark ? "text-cyan-500 bg-cyan-950/30 border border-cyan-900/30" : "text-slate-500 bg-slate-100 border border-slate-200/60"}`}>
                  <div className={`col-span-4 ${thCls}`}>Başlık / Slug</div>
                  <div className={`col-span-2 ${thCls}`}>Tür</div>
                  <div className={`col-span-3 ${thCls}`}>Kullanıcı</div>
                  <div className={`col-span-1 ${thCls}`}>Tarama</div>
                  <div className={`col-span-1 ${thCls}`}>Tarih</div>
                  <div className={`col-span-1 ${thCls}`}>Durum</div>
                </div>
                {qrList
                  .filter((q: AdminQrItem) => !search || (q.title || "").toLowerCase().includes(search.toLowerCase()))
                  .map((q: AdminQrItem, i) => (
                    <div key={i} className={`grid grid-cols-12 gap-4 px-8 py-5 rounded-[1.5rem] border transition-all duration-400 items-center group relative overflow-hidden
                      ${isDark ? "bg-[#0b1121]/60 border-cyan-900/30 hover:border-cyan-500/50 hover:bg-[#0b1121]/90 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1" : "bg-white/80 border-slate-200/60 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"}`}>
                      
                      {/* Shine effect */}
                      <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />

                      <div className="col-span-4 relative z-10">
                        <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}`}>{q.title}</p>
                        <p className={`text-[10px] font-mono ${sub}`}>/q/{q.short_slug}</p>
                      </div>
                      <div className="col-span-2 relative z-10">
                      <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-sm ${isDark ? "bg-[#020617] border border-cyan-900/50 text-cyan-400" : "bg-white border border-slate-200 text-slate-600"}`}>
                          {q.qr_type ?? "url"}
                        </span>
                      </div>
                      <div className={`col-span-3 text-sm font-medium truncate relative z-10 ${sub}`}>{q.user_email || "—"}</div>
                    <div className="col-span-1 text-xl font-black text-cyan-600 dark:text-cyan-400 relative z-10">{q.scan_count?.toLocaleString("tr-TR")}</div>
                      <div className={`col-span-1 text-xs font-medium relative z-10 ${sub}`}>
                        {q.created_at ? new Date(q.created_at).toLocaleDateString("tr-TR", {day:"2-digit",month:"short"}) : "—"}
                      </div>
                      <div className="col-span-1 relative z-10">
                      <span className={`w-2 h-2 rounded-full inline-block ${q.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-rose-500"}`}/>
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
                        style={{ height: `${Math.max(h,2)}%`, background: "linear-gradient(to top, #0d9488, #06b6d4)" }}/>
                      );
                    })}
                  </div>
                </div>

                {/* QR type breakdown */}
                <div className={`rounded-2xl border ${card} p-5`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${sub} mb-4`}>QR Tip Dağılımı</h3>
                  {Object.entries(
                    qrList.reduce((acc: Record<string,number>, q: AdminQrItem) => {
                      const t = q.qr_type || "url";
                      acc[t] = (acc[t]||0) + 1; return acc;
                    }, {} as Record<string,number>)
                  ).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([type, count]) => {
                    const total = qrList.length || 1;
                    return (
                      <div key={type} className="flex items-center gap-2 mb-3 last:mb-0">
                      <Hash size={10} className="text-cyan-500 shrink-0"/>
                        <span className={`text-xs flex-1 capitalize ${tx}`}>{type}</span>
                      <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-[#020617] border border-cyan-900/30" : "bg-slate-100"}`}>
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{width:`${Math.round((count/total)*100)}%`}}/>
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
                <div className="space-y-4">
                  {[...users].sort((a,b) => b.scan_count - a.scan_count).slice(0, 10).map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 group ${isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-cyan-900/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-1" : "bg-white/40 border-slate-200/50 hover:bg-white hover:border-cyan-300 hover:shadow-xl hover:-translate-y-1"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner transition-transform group-hover:scale-110 ${isDark ? "bg-cyan-950/50 text-cyan-400" : "bg-slate-100 text-slate-600"}`}>{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-bold truncate transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}`}>{u.full_name || u.email}</p>
                        <p className={`text-[10px] font-black tracking-widest uppercase mt-0.5 ${sub}`}>{u.qr_count} QR Kod</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{u.scan_count.toLocaleString("tr-TR")}</span>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>Tarama</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
    </div>

      {/* User Modal */}
      {editUser !== null && (
        <UserModal
          user={editUser === "new" ? null : editUser}
          isDark={isDark}
          actorRole={(currentUser?.role === "owner" ? "owner" : "admin")}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); }}
        />
      )}
    </div>
  );
}

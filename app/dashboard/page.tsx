"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Plus, QrCode, Pencil, Trash2, Power, X, Loader2, RefreshCw,
  CheckSquare, Square, BarChart2, Zap, Activity, TrendingUp,
  Sun, Moon, LayoutGrid, List, LogOut, Settings, AlertTriangle,
  Search, MoreHorizontal, Wand2, Sparkles, FolderKanban, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import {
  fetchQrCodes, fetchDashboardStats, deleteQrCode, toggleActive,
  type QrCode as QrCodeType, getOrCreateSettings,
} from "@/lib/supabase";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useToast } from "@/components/toast";
import nextDynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const Dashboard3DScene = nextDynamic(() => import("@/components/Dashboard3DScene"), { ssr: false });

// ─────────────────────────────────────────────────────────────
// 2026 PREMIUM DESIGN COMPONENTS
// ─────────────────────────────────────────────────────────────

/** 2026 Premium Glassmorphic QR Card */
function QRCardPremium({
  qr, onEdit, onDelete, onToggle, onAnalytics, delay
}: {
  qr: QrCodeType;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onAnalytics: () => void;
  delay: number;
}) {
  return (
    <div
      className={`group relative flex flex-col justify-between gap-4 p-5 rounded-[1.5rem] border transition-all duration-500 hover:-translate-y-1.5 shadow-lg animate-fade-in border-slate-200/60 bg-white/60 dark:border-white/10 dark:bg-white/[0.02] backdrop-blur-xl hover:bg-white dark:hover:bg-white/[0.06] hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-[0_8px_30px_rgba(124,58,237,0.15)]
      ${!qr.is_active ? "opacity-60 grayscale-[50%]" : ""}`}
      style={{ animationFillMode: 'both', animationDelay: `${delay}ms` }}
    >
      
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-indigo-500/0 group-hover:from-violet-500/5 group-hover:to-indigo-500/5 transition-colors duration-500 rounded-[1.5rem] pointer-events-none" />

      {/* Top: Icon & Actions */}
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
          <QrCode size={22} strokeWidth={2.5} />
        </div>
        
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl backdrop-blur-md">
          <button onClick={onAnalytics} className="p-1.5 rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 focus:ring-2 focus:ring-blue-500" title="Detaylı Analiz">
            <BarChart2 size={14} />
          </button>
          <button onClick={onToggle} className="p-1.5 rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 focus:ring-2 focus:ring-violet-500" title={qr.is_active ? "Pasifleştir" : "Aktifleştir"}>
            <Power size={14} strokeWidth={3} className={qr.is_active ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""} />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 focus:ring-2 focus:ring-violet-500">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 focus:ring-2 focus:ring-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* Middle: Title & Link */}
      <div className="mt-2 relative z-10 min-w-0">
        <h3 className="text-lg font-bold truncate mb-1 transition-colors text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-indigo-500">
          {qr.title}
        </h3>
        <p className="text-xs font-mono truncate transition-colors text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
          hekaqr.com/q/{qr.short_slug}
        </p>
      </div>
      
      {/* Bottom: Stats & Type */}
      <div className="flex items-end justify-between mt-2 pt-4 border-t relative z-10 transition-colors duration-500 border-slate-200/50 dark:border-white/10 group-hover:border-violet-500/20">
        <div>
           <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {qr.qr_type || "URL"}
           </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black leading-none text-slate-900 dark:text-white">
            {qr.scan_count.toLocaleString("tr-TR")}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1 text-slate-400 dark:text-slate-500">
            Tarama
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON LOADER (2026 Premium Loading State)
// ─────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  const p = "animate-pulse";
  const sh = "bg-slate-200/50 dark:bg-white/5";
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#030712] relative overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className={`w-64 h-full hidden lg:block ${sh} ${p} border-r border-slate-200/50 dark:border-white/10`} />
      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <div className={`h-20 w-full rounded-2xl ${sh} ${p}`} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className={`h-48 rounded-2xl ${sh} ${p}`} />
           <div className={`h-48 rounded-2xl ${sh} ${p}`} />
           <div className={`h-48 rounded-2xl ${sh} ${p}`} />
        </div>
        <div className="space-y-4">
          <div className={`h-12 w-full max-w-md rounded-xl ${sh} ${p}`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className={`h-[180px] rounded-[1.5rem] ${sh} ${p}`} style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────

type ViewModeType = "grid" | "list";
type FilterActiveType = "all" | "active" | "inactive";
type BentoType = "scans" | "active" | "total" | "ai" | "today" | null;

export default function Dashboard2026() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();

  // State
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid" as ViewModeType);
  const [filterActive, setFilterActive] = useState("all" as FilterActiveType);
  const [editTarget, setEditTarget] = useState<QrCodeType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dbError, setDbError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBento, setSelectedBento] = useState(null as BentoType);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Prevent hydration errors by waiting for the client to mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [codes, s] = await Promise.all([
        fetchQrCodes(),
        fetchDashboardStats(),
      ]);
      setQrs(codes);
      setStats(s);
      setDbError("");
    } catch (e) {
      setDbError((e as Error).message);
      toast.error("Veri yüklenemedi", "Hata");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Handlers
  const filtered = useMemo(() => qrs
    .filter(q => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.short_slug.includes(search);
      const matchFilter = filterActive === "all" || (filterActive === "active" ? q.is_active : !q.is_active);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [qrs, search, filterActive]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Bu QR kodu silmek istiyor musunuz?")) return;
    try {
      await deleteQrCode(id);
      setQrs(p => p.filter(q => q.id !== id));
      toast.success("QR kodu silindi", "Başarılı");
    } catch {
      toast.error("Silme başarısız", "Hata");
    }
  };

  const handleToggle = async (qr: QrCodeType) => {
    try {
      await toggleActive(qr.id, !qr.is_active);
      setQrs(p => p.map(q => q.id === qr.id ? { ...q, is_active: !qr.is_active } : q));
    } catch {
      toast.error("Durumu değiştiremedi", "Hata");
    }
  };

  const handleSuccess = (qr: QrCodeType) => {
    if (editTarget) {
      setQrs(p => p.map(q => q.id === qr.id ? qr : q));
    } else {
      setQrs(p => [qr, ...p]);
    }
    setShowCreateModal(false);
    setEditTarget(null);
    toast.success("Başarılı!", "✅");
  };

  const navItems = [
    { name: "Genel Bakış", icon: LayoutGrid, path: "/dashboard" },
    { name: "Kampanyalar", icon: FolderKanban, path: "/dashboard/campaigns" },
    { name: "Şablonlar", icon: Wand2, path: "/dashboard/templates" },
    { name: "Ayarlar", icon: Settings, path: "/dashboard/settings" },
  ];

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "owner";

  if (!isMounted || status === "loading" || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-500 relative overflow-hidden selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-violet-400/10 dark:bg-violet-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[130px] mix-blend-multiply dark:mix-blend-screen opacity-60" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEgxdjFIMHoiIGZpbGwtb3BhY2l0eT0iLjEiLz4KPC9zdmc+')] opacity-50 dark:opacity-20 mix-blend-overlay"></div>
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="relative z-40 w-20 lg:w-72 flex-shrink-0 border-r border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-2xl flex-col justify-between hidden md:flex transition-all duration-300">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-4 group outline-none mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500 shrink-0">
              <QrCode size={24} className="text-white drop-shadow-sm" />
            </div>
            <span className="font-black text-2xl text-slate-900 dark:text-white hidden lg:block tracking-tight">
              Heka<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">QR</span>
            </span>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${isActive ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)]" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}>
                  <Icon size={20} className={isActive ? "text-white" : ""} />
                  <span className="hidden lg:block">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 space-y-4">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20">
              <ShieldAlert size={20} />
              <span className="hidden lg:block">Admin Paneli</span>
            </Link>
          )}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hidden lg:flex">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                {session?.user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{session?.user?.email}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{session?.user?.role}</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 lg:p-8 bg-transparent">
          <div className="md:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <QrCode size={20} className="text-white" />
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreateModal(true)}
              className="hidden md:flex group relative items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-300 overflow-hidden active:scale-95 shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_30px_-6px_rgba(124,58,237,0.7)] hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 bg-[length:200%_auto] animate-shimmer" />
              <Plus size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">Yeni Kampanya</span>
            </button>
            <button onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-300">
              {isDark ? <Sun size={18} className="hover:text-yellow-400 transition-colors" /> : <Moon size={18} className="hover:text-indigo-500 transition-colors" />}
            </button>
            {session?.user && (
              <div className="md:hidden">
                <ProfileMenu
                  email={session.user.email || "User"}
                  role={(session.user.role as "owner" | "admin" | "user") ?? "user"}
                  onLogout={() => signOut({ callbackUrl: "/login" })}
                  avatarUrl={session.user.image}
                />
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-12">
            {dbError && (
              <div className="flex items-start gap-3 p-4 rounded-[1.5rem] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-sm animate-fade-in">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Bağlantı Sorunu</p>
                  <p className="text-xs mt-1 opacity-80">{dbError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div onClick={() => setSelectedBento("scans")} className="md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-8 sm:p-10 border border-white/10 shadow-[0_20px_50px_-10px_rgba(124,58,237,0.4)] group cursor-pointer hover:shadow-[0_20px_60px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 transition-all duration-300">
                 <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
                   <Dashboard3DScene />
                 </div>
                 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
                    <Activity size={160} strokeWidth={1} />
                 </div>
                 <div className="relative z-10 h-full flex flex-col justify-between min-h-[180px]">
                    <div>
                       <p className="text-violet-200 font-bold tracking-[0.2em] text-xs uppercase mb-3">Toplam Etkileşim</p>
                       <h3 className="text-6xl md:text-7xl font-black tracking-tight">{stats.total_scans.toLocaleString("tr-TR")}</h3>
                    </div>
                    <div className="mt-8 inline-flex items-center gap-3 bg-white/10 w-max px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/20">
                       <TrendingUp size={18} className="text-emerald-300" strokeWidth={3} />
                       <span className="text-sm font-bold text-emerald-100">+12% haftalık artış</span>
                    </div>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("active")} className="rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[220px] cursor-pointer hover:border-violet-500/30">
                 <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                    <CheckSquare size={28} strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-2">Aktif Kodlar</p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white">{stats.active_qr}</h3>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("total")} className="rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[220px] cursor-pointer hover:border-blue-500/30">
                 <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-inner">
                    <LayoutGrid size={28} strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-2">Tüm Kodlar</p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white">{stats.total_qr}</h3>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("ai")} className="md:col-span-3 lg:col-span-2 rounded-[2.5rem] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200/60 dark:border-amber-500/20 backdrop-blur-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:shadow-lg transition-all duration-500 cursor-pointer hover:-translate-y-1 hover:border-amber-500/40">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-500/20 dark:to-orange-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Sparkles size={32} className="text-amber-700 dark:text-amber-400" />
                 </div>
                 <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest mb-3">AI Engine</div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sistem Önerisi</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                      {stats.total_qr > 10 ? "Kodlarınızı kategorilere ayırmak için klasör sistemini kullanın. Böylece etkileşimleri daha kolay analiz edebilirsiniz." : "İlk kodunuzu oluşturdunuz! Şimdi hedef kitlenizin tarama yapması için kodu sosyal medyada paylaşın."}
                    </p>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("today")} className="md:col-span-3 lg:col-span-2 rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 sm:p-10 flex items-center justify-between group shadow-xl shadow-slate-200/30 dark:shadow-none hover:-translate-y-1 transition-all duration-500 cursor-pointer hover:border-rose-500/30">
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-3">Bugünkü Taramalar</p>
                    <h3 className="text-6xl font-black text-slate-900 dark:text-white">{stats.scans_today}</h3>
                 </div>
                 <div className="w-24 h-24 rounded-[2rem] bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-12 shadow-inner">
                    <Zap size={40} strokeWidth={2} />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Kodlarda ara..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none transition-colors bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-900 dark:text-white focus:border-black dark:focus:border-white" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 rounded-lg border bg-white dark:bg-[#111] border-gray-200 dark:border-[#333]">
                    {(["all", "active", "inactive"] as const).map(f => (
                      <button key={f} onClick={() => setFilterActive(f)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? "bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}>
                        {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
                      </button>
                    ))}
                  </div>
                  <button onClick={load} className="p-2 rounded-lg border transition-colors bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-24 px-6 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl animate-fade-in">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 shadow-inner">
                    <QrCode size={32} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Henüz QR Kodunuz Yok</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">İlk akıllı bağlantınızı oluşturun ve kitlenizle etkileşime geçmeye hemen başlayın.</p>
                  <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                    <Plus size={20} strokeWidth={3} /> İlk QR Kodu Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                  {filtered.map((qr, i) => (
                    <QRCardPremium
                      key={qr.id}
                      qr={qr}
                      delay={i * 75}
                      onEdit={() => { setEditTarget(qr); setShowCreateModal(true); }}
                      onDelete={() => handleDelete(qr.id)}
                      onToggle={() => handleToggle(qr)}
                      onAnalytics={() => router.push(`/dashboard/analytics/${qr.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setShowCreateModal(true)} className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-lg z-50 transition-transform active:scale-95 sm:hidden">
              <Plus size={24} />
            </button>
          </div>
        </main>
      </div>

      {selectedBento && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-fade-in" style={{ animationDuration: '200ms' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBento(null)} />
          <div className="relative w-full max-w-2xl rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 shadow-2xl animate-scale-in">
             <button onClick={() => setSelectedBento(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-white/10">
              <X size={20} strokeWidth={2.5} />
            </button>
            
            {selectedBento === "scans" && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6">
                  <Activity size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Toplam Etkileşim Detayları</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Sisteminizdeki tüm QR kodların toplam taranma verileri.</p>
                <div className="surface rounded-2xl p-6 border-violet-100 dark:border-violet-500/10">
                  <div className="text-5xl font-black text-violet-600 dark:text-violet-400 mb-4">{stats.total_scans.toLocaleString("tr-TR")}</div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">Bu etkileşimler, hedef kitlenizin markanızla ne kadar aktif etkileşimde bulunduğunu gösterir. Daha detaylı analizler için listedeki tekil QR kod raporlarına göz atabilirsiniz.</p>
                </div>
              </div>
            )}

            {selectedBento === "active" && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                  <CheckSquare size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Yayındaki Kampanyalar</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Şu anda aktif olan ve kullanıcı taramasına açık olan QR kodlarınız.</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {qrs.filter(q => q.is_active).length > 0 ? qrs.filter(q => q.is_active).map(q => (
                    <div key={q.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors">
                      <span className="font-bold text-slate-900 dark:text-white truncate pr-4">{q.title}</span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-black/20 px-2 py-1 rounded-md shrink-0">/q/{q.short_slug}</span>
                    </div>
                  )) : (
                    <div className="text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl"><p className="text-slate-500">Aktif QR kod bulunmuyor.</p></div>
                  )}
                </div>
              </div>
            )}

            {selectedBento === "total" && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                  <LayoutGrid size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Tüm Kodlar</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Aktif ve pasif tüm kampanyalarınızın genel özeti.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="surface rounded-2xl p-6 text-center bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30">
                    <div className="text-4xl font-black text-emerald-500 mb-2">{stats.active_qr}</div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Aktif Kampanya</p>
                  </div>
                  <div className="surface rounded-2xl p-6 text-center bg-slate-50/30 dark:bg-white/[0.02]">
                    <div className="text-4xl font-black text-slate-400 mb-2">{stats.total_qr - stats.active_qr}</div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Pasif Kampanya</p>
                  </div>
                </div>
              </div>
            )}

            {selectedBento === "ai" && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-500/20 dark:to-orange-500/30 flex items-center justify-center mb-6 shadow-inner">
                  <Sparkles size={28} className="text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">AI Sistem Önerileri</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Yapay zeka destekli kampanya optimizasyon tavsiyeleri.</p>
                <div className="surface rounded-2xl p-6 bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20">
                  <ul className="space-y-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                      <p className="leading-relaxed">Son 7 gündeki tarama verilerinize göre, kampanyalarınızı sabah 09:00 ile 11:00 arasında sosyal medyada paylaşmanız dönüşüm oranlarınızı ortalama %14 artırabilir.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                      <p className="leading-relaxed">{stats.total_qr > 10 ? "Kodlarınızı kategorilere ayırmak için klasör sistemini kullanın. Böylece A/B testlerini ve etkileşimleri daha kolay analiz edebilirsiniz." : "İlk kodunuzu oluşturdunuz! Şimdi hedef kitlenizin tarama yapması için kodu dijital ve basılı materyallerinize yerleştirin."}</p>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {selectedBento === "today" && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
                  <Zap size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Bugünkü Performans</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Sadece bugüne (son 24 saat) ait anlık tarama istatistikleri.</p>
                <div className="surface rounded-2xl p-8 flex items-center justify-center flex-col min-h-[180px] bg-rose-50/50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/20">
                  <div className="text-7xl font-black text-rose-600 dark:text-rose-400 mb-4">{stats.scans_today}</div>
                  <p className="text-sm font-bold text-rose-800/60 dark:text-rose-200/50 uppercase tracking-widest">Başarılı Tarama Gerçekleşti</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setSelectedBento(null)} variant="default" size="lg">Anladım, Kapat</Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateQRModal
          editing={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

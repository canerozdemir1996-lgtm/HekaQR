"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Plus, QrCode, Pencil, Trash2, Power, X, Loader2, RefreshCw,
  CheckSquare, Square, BarChart2, Zap, Activity, TrendingUp,
  Sun, Moon, LayoutGrid, List, LogOut, Settings, AlertTriangle,
  Search, MoreHorizontal, Wand2, Sparkles
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  fetchQrCodes, fetchDashboardStats, deleteQrCode, toggleActive,
  type QrCode as QrCodeType, getOrCreateSettings, type UserSettings,
  fetchFolders, type QrFolder,
} from "@/lib/supabase";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useToast } from "@/components/toast";
import nextDynamic from "next/dynamic";

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] relative overflow-hidden pt-6">
      {/* Header Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className={`h-20 w-full rounded-[2rem] ${sh} ${p}`} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <div className={`md:col-span-2 lg:col-span-2 h-[220px] rounded-[2.5rem] ${sh} ${p}`} />
          <div className={`h-[220px] rounded-[2.5rem] ${sh} ${p}`} style={{ animationDelay: '100ms' }} />
          <div className={`h-[220px] rounded-[2.5rem] ${sh} ${p}`} style={{ animationDelay: '200ms' }} />
          <div className={`md:col-span-3 lg:col-span-2 h-[160px] rounded-[2.5rem] ${sh} ${p}`} style={{ animationDelay: '300ms' }} />
          <div className={`md:col-span-3 lg:col-span-2 h-[160px] rounded-[2.5rem] ${sh} ${p}`} style={{ animationDelay: '400ms' }} />
        </div>
        {/* Controls & QR Grid Skeleton */}
        <div className="space-y-6">
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

export default function Dashboard2026() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();

  // State
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [editTarget, setEditTarget] = useState<QrCodeType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dbError, setDbError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

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

  if (!isMounted || status === "loading" || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-500 relative overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200">
      {/* Ambient Premium Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[130px] mix-blend-multiply dark:mix-blend-screen opacity-60" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEgxdjFIMHoiIGZpbGwtb3BhY2l0eT0iLjEiLz4KPC9zdmc+')] opacity-50 dark:opacity-20 mix-blend-overlay"></div>
      </div>

      {/* PREMIUM FLOATING HEADER - 2026 Standard */}
      <header className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-4 sm:gap-6 px-5 sm:px-6 py-4 rounded-[2rem] bg-white/70 dark:bg-[#0f1627]/60 border border-slate-200/50 dark:border-white/10 backdrop-blur-2xl shadow-xl shadow-slate-200/20 dark:shadow-none transition-all duration-300">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 outline-none focus:ring-4 focus:ring-violet-500/20 rounded-2xl">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                <QrCode size={22} className="text-white drop-shadow-sm" />
              </div>
              <span className="font-black text-xl text-slate-900 dark:text-white hidden sm:block">
                Heka<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">QR</span>
              </span>
            </Link>

            {/* Quick Create Button (Desktop) */}
            <div className="hidden sm:block flex-1 max-w-[200px]"></div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCreateModal(true)}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(124,58,237,0.6)] hover:scale-105 active:scale-95 transition-all duration-300">
                <Plus size={16} strokeWidth={3} /> Yeni QR
              </button>

              <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>

              <button onClick={toggleTheme}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-300 outline-none focus:ring-2 focus:ring-violet-500/50">
                {isDark ? <Sun size={18} className="hover:text-yellow-400 transition-colors" /> : <Moon size={18} className="hover:text-indigo-500 transition-colors" />}
              </button>

              {session?.user && (
                <ProfileMenu
                  email={session.user.email || "User"}
                  role={(session.user.role as "owner" | "admin" | "user") ?? "user"}
                  onLogout={() => signOut({ callbackUrl: "/login" })}
                  isDark={isDark}
                  avatarUrl={session.user.image}
                />
              )}
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Error Alert */}
        {dbError && (
          <div className="flex items-start gap-3 p-4 rounded-[1.5rem] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-sm animate-fade-in">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Bağlantı Sorunu</p>
              <p className="text-xs mt-1 opacity-80">{dbError}</p>
            </div>
          </div>
        )}

        {/* 2026 PREMIUM BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {/* Bento 1: Total Scans (Hero) */}
          <div className="md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-8 sm:p-10 border border-white/10 shadow-[0_20px_50px_-10px_rgba(124,58,237,0.4)] group">
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

          {/* Bento 2: Active QR */}
          <div className="rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[220px]">
             <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                <CheckSquare size={28} strokeWidth={2.5} />
             </div>
             <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-2">Aktif Kodlar</p>
                <h3 className="text-5xl font-black text-slate-900 dark:text-white">{stats.active_qr}</h3>
             </div>
          </div>

          {/* Bento 3: Total QR */}
          <div className="rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[220px]">
             <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-inner">
                <LayoutGrid size={28} strokeWidth={2.5} />
             </div>
             <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-2">Tüm Kodlar</p>
                <h3 className="text-5xl font-black text-slate-900 dark:text-white">{stats.total_qr}</h3>
             </div>
          </div>

          {/* Bento 4: AI Insight */}
          <div className="md:col-span-3 lg:col-span-2 rounded-[2.5rem] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200/60 dark:border-amber-500/20 backdrop-blur-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:shadow-lg transition-all duration-500">
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

          {/* Bento 5: Today's Scans */}
          <div className="md:col-span-3 lg:col-span-2 rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-8 sm:p-10 flex items-center justify-between group shadow-xl shadow-slate-200/30 dark:shadow-none hover:-translate-y-1 transition-all duration-500">
             <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] text-xs uppercase mb-3">Bugünkü Taramalar</p>
                <h3 className="text-6xl font-black text-slate-900 dark:text-white">{stats.scans_today}</h3>
             </div>
             <div className="w-24 h-24 rounded-[2rem] bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-12 shadow-inner">
                <Zap size={40} strokeWidth={2} />
             </div>
          </div>
        </div>

        {/* QR Management Section */}
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
                  <button key={f}
                    onClick={() => setFilterActive(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? "bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}>
                    {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
                  </button>
                ))}
              </div>
              <button onClick={load} className="p-2 rounded-lg border transition-colors bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="text-center py-24 px-6 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl animate-fade-in">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 shadow-inner">
                <QrCode size={32} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Henüz QR Kodunuz Yok</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                İlk akıllı bağlantınızı oluşturun ve kitlenizle etkileşime geçmeye hemen başlayın.
              </p>
              <button onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                <Plus size={20} strokeWidth={3} /> İlk QR Kodu Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {filtered.map((qr, i) => (
                <QRCardPremium
                  key={qr.id}
                  qr={qr}
                  delay={i * 75} // Staggered Animation
                  onEdit={() => { setEditTarget(qr); setShowCreateModal(true); }}
                  onDelete={() => handleDelete(qr.id)}
                  onToggle={() => handleToggle(qr)}
                  onAnalytics={() => toast.info(`${qr.title} için detaylı analitik sayfası yakında!`, "Analiz")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-lg z-50 transition-transform active:scale-95 sm:hidden">
          <Plus size={24} />
        </button>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateQRModal
          editing={editTarget}
          theme={theme}
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

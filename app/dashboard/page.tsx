"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useMemo } from "react";
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

// ─────────────────────────────────────────────────────────────
// 2026 PREMIUM DESIGN COMPONENTS
// ─────────────────────────────────────────────────────────────

/** Minimalist QR Card */
function QRCardMinimal({
  qr, isDark, onEdit, onDelete, onToggle
}: {
  qr: QrCodeType;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border transition-colors shadow-sm
      ${isDark ? "border-[#333] bg-[#111] hover:border-gray-600" : "border-gray-200 bg-white hover:border-gray-300"} 
      ${!qr.is_active ? "opacity-60 grayscale-[30%]" : ""}`}>
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
          <QrCode size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>{qr.title}</h3>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-600"}`}>{qr.qr_type || "url"}</span>
          </div>
          <p className={`text-xs font-mono truncate ${isDark ? "text-gray-500" : "text-gray-500"}`}>/q/{qr.short_slug}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-6 sm:ml-4 border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
        <div className="text-right flex-1 sm:flex-none">
          <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{qr.scan_count.toLocaleString("tr-TR")}</p>
          <p className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-500"}`}>Tarama</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} className={`p-2 rounded-md transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`} title={qr.is_active ? "Pasifleştir" : "Aktifleştir"}><Power size={16} className={qr.is_active ? "text-emerald-500" : ""} /></button>
          <button onClick={onEdit} className={`p-2 rounded-md transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}><Pencil size={16} /></button>
          <button onClick={onDelete} className={`p-2 rounded-md transition-colors ${isDark ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10" : "text-gray-500 hover:text-red-600 hover:bg-red-50"}`}><Trash2 size={16} /></button>
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

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center transition-colors duration-500">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Uzay üssü hazırlanıyor...</p>
        </div>
      </div>
    );
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
                  isDark={isDark}
                  onLogout={() => signOut({ callbackUrl: "/login" })}
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
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none transition-colors ${isDark ? "bg-[#111] border-[#333] text-white focus:border-white" : "bg-white border-gray-200 focus:border-black text-gray-900"}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center p-1 rounded-lg border ${isDark ? "bg-[#111] border-[#333]" : "bg-white border-gray-200"}`}>
                {(["all", "active", "inactive"] as const).map(f => (
                  <button key={f}
                    onClick={() => setFilterActive(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? (isDark ? "bg-[#333] text-white" : "bg-gray-100 text-gray-900") : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}>
                    {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
                  </button>
                ))}
              </div>
              <button onClick={load} className={`p-2 rounded-lg border transition-colors ${isDark ? "bg-[#111] border-[#333] text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-900"}`}>
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className={`text-center py-20 px-6 rounded-xl border border-dashed ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-300 bg-white"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-[#111]" : "bg-gray-50"}`}>
                <QrCode size={20} className="text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Henüz QR kodunuz yok</p>
              <p className="text-sm text-gray-500 mb-6">İlk bağlantınızı oluşturarak başlayın.</p>
              <button onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                <Plus size={16} /> QR Kod Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filtered.map(qr => (
                <QRCardMinimal
                  key={qr.id}
                  qr={qr}
                  isDark={isDark}
                  onEdit={() => { setEditTarget(qr); setShowCreateModal(true); }}
                  onDelete={() => handleDelete(qr.id)}
                  onToggle={() => handleToggle(qr)}
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

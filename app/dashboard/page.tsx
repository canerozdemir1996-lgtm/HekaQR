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

/** Modern neumorphic stat card with AI suggestions */
function StatCard({
  label, value, icon, color, trend, aiSuggestion
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: number;
  aiSuggestion?: string;
}) {
  return (
    <div className="group relative rounded-3xl p-6 transition-all duration-500
      bg-gradient-to-br from-white/8 to-white/4 backdrop-blur-2xl
      border border-white/20 hover:border-white/40
      hover:shadow-2xl hover:shadow-violet-500/30
      hover:-translate-y-2 cursor-default">
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">
            {label}
          </p>
          <p className="text-4xl font-black text-white mb-1">
            {value.toLocaleString("tr-TR")}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={12} style={{ color }} />
              <span className="text-xs font-bold" style={{ color }}>
                ↑ {trend}% este haftaya göre
              </span>
            </div>
          )}
        </div>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center
          bg-gradient-to-br from-white/10 to-white/5 border border-white/10
          group-hover:scale-110 transition-transform duration-500"
          style={{ borderColor: `${color}40` }}>
          <span style={{ color }} className="text-2xl">
            {icon}
          </span>
        </div>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="relative z-10 mt-4 flex items-start gap-2 p-3 rounded-xl
          bg-white/5 border border-amber-500/20">
          <Sparkles size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <span className="text-xs text-amber-200 leading-relaxed">
            {aiSuggestion}
          </span>
        </div>
      )}
    </div>
  );
}

/** Premium QR card with neumorphism */
function QRCardPremium({
  qr, isDark, onEdit, onDelete, onToggle
}: {
  qr: QrCodeType;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`group relative rounded-2xl overflow-hidden transition-all duration-500
      border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8
      hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-1
      ${!qr.is_active ? "opacity-50" : ""}`}>

      {/* Neumorphic top section */}
      <div className="p-5 pb-4 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${qr.is_active ? "bg-emerald-400" : "bg-slate-700"}`} />
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg
              bg-violet-500/20 text-violet-300 uppercase tracking-wider">
              {(qr.qr_type || "url").toUpperCase()}
            </span>
          </div>
        </div>

        <p className="font-bold text-sm text-white truncate group-hover:text-violet-200 transition-colors">
          {qr.title}
        </p>
        <p className="text-[10px] text-slate-500 font-mono truncate mt-1">
          /q/{qr.short_slug}
        </p>
      </div>

      {/* Stats bar with neumorphism */}
      <div className="border-t border-white/5 px-5 py-4 flex items-center justify-between
        bg-gradient-to-r from-white/3 to-transparent">
        <span className="text-2xl font-black text-white">
          {qr.scan_count.toLocaleString("tr-TR")}
        </span>
        <span className="text-xs text-slate-500">tarama</span>
      </div>

      {/* Action buttons with micro-interactions */}
      <div className="border-t border-white/5 px-3 py-3 flex items-center gap-2 bg-white/2">
        <button onClick={onEdit}
          className="flex-1 py-2 rounded-lg text-xs font-bold
          bg-white/5 hover:bg-violet-500/20 text-slate-300 hover:text-violet-200
          transition-all duration-300 hover:scale-105 active:scale-95">
          Düzenle
        </button>
        <button onClick={onToggle}
          className="p-2 rounded-lg text-slate-500 hover:text-amber-400
          hover:bg-amber-500/10 transition-all duration-300"
          title={qr.is_active ? "Pasifleştir" : "Aktifleştir"}>
          <Power size={14} />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400
          hover:bg-red-500/10 transition-all duration-300">
          <Trash2 size={14} />
        </button>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {/* PREMIUM HEADER - 2026 Standard */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-3xl bg-black/40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600
                flex items-center justify-center shadow-lg shadow-violet-500/40
                group-hover:scale-110 transition-transform duration-500">
                <QrCode size={20} className="text-white" />
              </div>
              <span className="font-black text-lg text-white">
                QR<span className="text-violet-400">Hub</span>
              </span>
            </Link>

            {/* Search - Premium glassmorphism */}
            <div className="hidden md:block flex-1 max-w-sm">
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  placeholder="QR kodlarında ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-sm
                    bg-white/5 backdrop-blur-md border border-white/10 text-white
                    placeholder:text-slate-600
                    hover:bg-white/8 hover:border-white/15
                    focus:bg-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20
                    transition-all duration-300"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCreateModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-violet-600 to-blue-600
                hover:from-violet-500 hover:to-blue-500
                active:from-violet-700 active:to-blue-700
                shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60
                hover:scale-105 active:scale-95 transition-all duration-300">
                <Plus size={16} /> Yeni
              </button>

              <button onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10
                hover:bg-white/10 hover:border-white/15 transition-all duration-300">
                {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-400" />}
              </button>

              <button onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2.5 rounded-xl text-red-400 hover:text-red-300
                hover:bg-red-500/10 transition-all duration-300">
                <LogOut size={18} />
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
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error Alert */}
        {dbError && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/30
            border border-red-900/50 text-red-300 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Bağlantı Sorunu</p>
              <p className="text-xs mt-1 opacity-80">{dbError}</p>
            </div>
          </div>
        )}

        {/* Stats Grid - Premium Neumorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Toplam QR"
            value={stats.total_qr}
            icon="⚡"
            color="#7c3aed"
            trend={12}
            aiSuggestion={stats.total_qr > 100 ? "100+ QR kodunuz var. Klasörlerle organize etmeyi düşünün!" : undefined}
          />
          <StatCard
            label="Aktif"
            value={stats.active_qr}
            icon="✨"
            color="#10b981"
          />
          <StatCard
            label="Tarama"
            value={stats.total_scans}
            icon="📊"
            color="#3b82f6"
          />
          <StatCard
            label="Bugün"
            value={stats.scans_today}
            icon="🎯"
            color="#f59e0b"
          />
        </div>

        {/* QR Management Section */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-white/5 p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f}
                  onClick={() => setFilterActive(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                    transition-all duration-300 ${
                      filterActive === f
                        ? "bg-violet-500/30 text-violet-200 border border-violet-500/50"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                    }`}>
                  {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                <List size={16} />
              </button>
              <button onClick={load}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="text-center py-24 px-6">
              <Wand2 size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-bold mb-2">QR kodunuz yok</p>
              <p className="text-sm text-slate-600 mb-6">İlk QR kodunuzu oluşturmaya başlayın</p>
              <button onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white
                bg-gradient-to-r from-violet-600 to-blue-600
                hover:shadow-lg hover:shadow-violet-500/40 hover:scale-105 active:scale-95
                transition-all duration-300">
                <Plus size={18} /> QR Kod Oluştur
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(qr => (
                <QRCardPremium
                  key={qr.id}
                  qr={qr}
                  isDark={isDark}
                  onEdit={() => { setEditTarget(qr); setShowCreateModal(true); }}
                  onDelete={() => handleDelete(qr.id)}
                  onToggle={() => handleToggle(qr)}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(qr => (
                <div key={qr.id} className="p-6 flex items-center justify-between
                  hover:bg-white/3 transition-all duration-300 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                      {qr.title}
                    </p>
                    <p className="text-xs text-slate-600 font-mono truncate">
                      /q/{qr.short_slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-right">
                      <p className="text-lg font-black text-white">
                        {qr.scan_count}
                      </p>
                      <p className="text-xs text-slate-600">tarama</p>
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditTarget(qr); setShowCreateModal(true); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-violet-300
                        bg-violet-500/10 hover:bg-violet-500/20 transition-all duration-300">
                        Düzenle
                      </button>
                      <button onClick={() => handleDelete(qr.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400
                        hover:bg-red-500/10 transition-all duration-300">
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 rounded-full
          bg-gradient-to-br from-violet-600 to-blue-600
          flex items-center justify-center text-white shadow-2xl shadow-violet-500/50
          hover:scale-110 active:scale-95 transition-all duration-300
          focus:ring-4 focus:ring-violet-500/50 sm:hidden">
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

"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, QrCode, Pencil, Trash2, Power, X, Loader2, RefreshCw,
  FileSpreadsheet, Download, CheckSquare, Square, FileImage,
  Sun, Moon, LayoutGrid, List, MoreHorizontal, Check,
  AlertTriangle, LogOut, Shield, Users, Settings, Mail,
  BarChart2, Zap, Activity, TrendingUp, FileText as FilePdf, Search
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  fetchQrCodes, fetchDashboardStats, fetchDailyStats,
  fetchDeviceStats, fetchRecentScans, deleteQrCode, bulkDeleteQrCodes,
  toggleActive, fetchStyles, type QrCode as QrCodeType, type QrStyle,
  getSupabase, getOrCreateSettings, updateSettings, type UserSettings,
  fetchFolders, type QrFolder,
} from "@/lib/supabase";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import { TemplatesSection } from "@/components/TemplatesSection";
import { BulkSection } from "@/components/BulkSection";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useToast } from "@/components/toast";
import { typography, colors, shadows, components, animations } from "@/lib/design-system-2026";
import { Button } from "@/lib/button-system-2026";

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function normalizeCustomDomain(domain: string): string {
  const d = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return d;
}

function getPublicOrigin(settings: UserSettings | null): string {
  const d = settings?.custom_domain ? normalizeCustomDomain(settings.custom_domain) : "";
  if (d) return `https://${d}`;
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function dlPng(qrData: QrCodeType, origin: string) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const url = `${origin}/q/${qrData.short_slug}`;
  const qr = new QRCodeStyling({
    width: 1024, height: 1024, data: url, margin: 24,
    dotsOptions: { type: "rounded", color: "#0f172a" },
    cornersSquareOptions: { type: "extra-rounded", color: "#4f46e5" },
    cornersDotOptions: { type: "dot", color: "#4f46e5" },
    backgroundOptions: { color: "#ffffff" },
  });
  await qr.download({ 
    name: qrData.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(), 
    extension: "png" 
  });
}

async function dlSvg(qrData: QrCodeType, origin: string) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const url = `${origin}/q/${qrData.short_slug}`;
  const qr = new QRCodeStyling({
    width: 1024, height: 1024, data: url, margin: 24,
    dotsOptions: { type: "rounded", color: "#0f172a" },
    cornersSquareOptions: { type: "extra-rounded", color: "#4f46e5" },
    cornersDotOptions: { type: "dot", color: "#4f46e5" },
    backgroundOptions: { color: "#ffffff" },
  });
  await qr.download({ 
    name: qrData.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(), 
    extension: "svg" 
  });
}

// ─────────────────────────────────────────────────────────────
// QR Card Components
// ─────────────────────────────────────────────────────────────

function ActionMenu({
  open, onClose, items, anchorRect, isDark,
}: {
  open: boolean;
  onClose: () => void;
  items: Array<{ icon: React.ReactNode; label: string; onClick?: () => void; href?: string; danger?: boolean }>;
  anchorRect: DOMRect | null;
  isDark: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !anchorRect) return null;
  
  const pos = {
    top: Math.min(anchorRect.bottom + 6, window.innerHeight - 200),
    left: Math.min(Math.max(anchorRect.right - 184, 8), window.innerWidth - 192),
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onMouseDown={onClose} />
      <div
        className={`fixed z-[9999] w-44 rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? "bg-slate-900/95 border-white/10" : "bg-white/95 border-slate-200"
        } backdrop-blur-xl`}
        style={{ top: pos.top, left: pos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-1">
          {items.map((item, i) => item.href ? (
            <Link key={i} href={item.href} onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"
              }`}>
              {item.icon}{item.label}
            </Link>
          ) : (
            <button key={i} onClick={() => { item.onClick?.(); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                item.danger 
                  ? "text-red-400 hover:bg-red-500/10" 
                  : isDark 
                    ? "text-slate-300 hover:bg-white/5" 
                    : "text-slate-600 hover:bg-slate-50"
              }`}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}

function QRCard({ 
  qr, selected, onSelect, onEdit, onDelete, onToggle, isDark, origin 
}: {
  qr: QrCodeType; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void; isDark: boolean;
  origin: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const TYPE_COLORS: Record<string, string> = {
    url: "#6366f1", vcard: "#8b5cf6", wifi: "#06b6d4", sms: "#10b981",
    email: "#f59e0b", whatsapp: "#25D366", text: "#64748b", phone: "#ef4444",
  };
  const typeColor = TYPE_COLORS[qr.qr_type ?? "url"] ?? "#6366f1";

  return (
    <div className={`group relative rounded-2xl border transition-all ${
      isDark
        ? selected ? "bg-violet-950/30 border-violet-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
        : selected ? "bg-violet-50 border-violet-300" : "bg-white border-slate-200 hover:border-slate-300"
    } ${!qr.is_active ? "opacity-50" : ""} hover:-translate-y-1 hover:shadow-lg`}>

      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <button onClick={onSelect} className={isDark ? "text-slate-700" : "text-slate-300"}>
            {selected ? <CheckSquare size={13} className="text-violet-500"/> : <Square size={13}/>}
          </button>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${typeColor}18`, color: typeColor }}>
            {(qr.qr_type ?? "url").toUpperCase()}
          </span>
        </div>

        <p className={`font-semibold text-sm text-center truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}>
          {qr.title}
        </p>
        <p className={`text-[10px] font-mono text-center truncate mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          /q/{qr.short_slug}
        </p>
      </div>

      <div className={`px-4 py-2.5 border-t ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center justify-between`}>
        <p className={`text-lg font-black ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {qr.scan_count.toLocaleString("tr-TR")}
        </p>
        <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>tarama</span>
      </div>

      <div className={`px-3 py-2.5 border-t ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center gap-1.5`}>
        <button onClick={onEdit} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isDark 
            ? "bg-white/5 hover:bg-white/10 text-slate-400" 
            : "bg-slate-50 hover:bg-slate-100 text-slate-500"
        }`}>
          <Pencil size={11} className="mx-auto"/>
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setAnchorRect(r);
              setMenuOpen(p => !p);
            }}
            className={`p-1.5 rounded-lg transition-all ${
              isDark ? "text-slate-600 hover:text-slate-300 hover:bg-white/8" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <MoreHorizontal size={12}/>
          </button>
          <ActionMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRect={anchorRect}
            isDark={isDark}
            items={[
              { icon: <Power size={11}/>, label: qr.is_active ? "Pasifleştir" : "Aktifleştir", onClick: onToggle },
              { icon: <FileImage size={11}/>, label: "PNG İndir", onClick: () => { void dlPng(qr, origin); } },
              { icon: <Download size={11}/>, label: "SVG İndir", onClick: () => { void dlSvg(qr, origin); } },
              { icon: <Trash2 size={11}/>, label: "Sil", onClick: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();

  // State
  const [activeSection, setActiveSection] = useState<"qrlist"|"create"|"templates"|"bulk"|"settings">("qrlist");
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<QrCodeType | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"date" | "scans" | "title">("date");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Theme classes
  const pg = "app-bg";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const card = isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200";

  // Load data
  const load = useCallback(async () => {
    setLoading(true); 
    setDbError("");
    try {
      const [codes, s, st, flds] = await Promise.all([
        fetchQrCodes(),
        fetchDashboardStats(),
        getOrCreateSettings(),
        fetchFolders(),
      ]);
      setQrs(codes); 
      setStats(s);
      setSettings(st);
      setFolders(flds);
      
      // Mock user for now
      setCurrentUserEmail("user@example.com");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hata";
      setDbError(msg.includes("env") || msg.includes("fetch") 
        ? "Supabase bağlantısı kurulamadı. .env.local kontrol edin."
        : msg
      );
    }
    finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handlers
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Bu QR kodu silmek istiyor musunuz?")) return;
    try {
      const qr = qrs.find(q => q.id === id);
      await deleteQrCode(id);
      setQrs(p => p.filter(q => q.id !== id));
      setSelected(p => { const n = new Set(p); n.delete(id); return n; });
      setStats(p => ({ 
        ...p, 
        total_qr: Math.max(0, p.total_qr - 1), 
        active_qr: qr?.is_active ? Math.max(0, p.active_qr - 1) : p.active_qr 
      }));
      toast.success("QR kodu silindi.", "Başarılı");
    } catch (e) { 
      alert("Silme hatası: " + (e instanceof Error ? e.message : "Hata")); 
    }
  }, [qrs, toast]);

  const handleToggle = useCallback(async (qr: QrCodeType) => {
    try {
      await toggleActive(qr.id, !qr.is_active);
      setQrs(p => p.map(q => q.id === qr.id ? { ...q, is_active: !qr.is_active } : q));
      setStats(p => ({ ...p, active_qr: p.active_qr + (qr.is_active ? -1 : 1) }));
    } catch { /* noop */ }
  }, []);

  const handleSuccess = useCallback((created: QrCodeType) => {
    if (editTarget) { 
      setQrs(p => p.map(q => q.id === created.id ? created : q)); 
    } else { 
      setQrs(p => [created, ...p]); 
      setStats(p => ({ 
        ...p, 
        total_qr: p.total_qr + 1, 
        active_qr: created.is_active ? p.active_qr + 1 : p.active_qr 
      })); 
    }
    setActiveSection("qrlist"); 
    setEditTarget(null);
    toast.success(editTarget ? "Güncellendi" : "Oluşturuldu", "Başarılı");
  }, [editTarget, toast]);

  const filtered = useMemo(() => qrs
    .filter(q => {
      const ms = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.short_slug.includes(search.toLowerCase());
      const mst = filterStatus === "all" || (filterStatus === "active" ? q.is_active : !q.is_active);
      const mf = folderFilter === "all" || (folderFilter === "none" ? !q.folder_id : q.folder_id === folderFilter);
      return ms && mst && mf;
    })
    .sort((a, b) => {
      if (sortBy === "scans") return b.scan_count - a.scan_count;
      if (sortBy === "title") return a.title.localeCompare(b.title, "tr");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }), [qrs, search, filterStatus, folderFilter, sortBy]);

  const publicOrigin = useMemo(() => getPublicOrigin(settings), [settings]);

  const handleLogout = async () => {
    router.push("/login");
  };

  // Main UI
  return (
    <div className={`${pg} min-h-screen flex flex-col`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl bg-black/40 border-white/10 transition-all duration-300`}>
        <div className="flex items-center justify-between px-6 py-4 max-w-8xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 flex items-center justify-center">
              <QrCode size={16} className="text-white"/>
            </div>
            <span className="font-black text-sm">QRHub</span>
          </Link>

          <div className="flex-1 max-w-xs mx-6 hidden md:flex">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 w-full">
              <Search size={14} className="text-slate-500"/>
              <input
                type="text"
                placeholder="QR ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
            <ProfileMenu email={currentUserEmail} role="user" isDark={isDark} onLogout={handleLogout} avatarUrl={null}/>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-8xl mx-auto w-full">
        {/* Error */}
        {dbError && (
          <div className="flex items-start gap-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 px-4 py-3 mb-6">
            <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
            <div>
              <p className="font-semibold text-sm">Veritabanı hatası</p>
              <p className="text-xs mt-0.5 opacity-80">{dbError}</p>
            </div>
          </div>
        )}

        {/* Sections */}
        {activeSection === "templates" && (
          <TemplatesSection isDark={isDark} onBack={() => setActiveSection("qrlist")}/>
        )}
        {activeSection === "bulk" && (
          <BulkSection isDark={isDark} onBack={() => setActiveSection("qrlist")}/>
        )}
        {activeSection === "create" && (
          <CreateQRModal
            editing={editTarget}
            theme={theme}
            onClose={() => { setActiveSection("qrlist"); setEditTarget(null); }}
            onSuccess={handleSuccess}
          />
        )}
        {activeSection === "settings" && (
          <div className={`rounded-2xl border ${card} p-6`}>
            <h2 className={`text-lg font-black ${tx}`}>Ayarlar</h2>
            <p className={`text-sm mt-1 ${sub}`}>White-label ve entegrasyonlar</p>
            <p className="mt-4 text-sm text-amber-400">Ayarlar modülü geliştirme aşamasındadır.</p>
          </div>
        )}
        {activeSection === "qrlist" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Toplam QR", value: stats.total_qr, color: "#7c3aed" },
                { label: "Aktif", value: stats.active_qr, color: "#10b981" },
                { label: "Toplam Tarama", value: stats.total_scans, color: "#f59e0b" },
                { label: "Bugün", value: stats.scans_today, color: "#ec4899" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-6 border bg-white/5 border-white/10 hover:border-white/20 transition-all`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-black mt-2" style={{ color: s.color }}>
                    {s.value.toLocaleString("tr-TR")}
                  </p>
                </div>
              ))}
            </div>

            {/* Control bar */}
            <div className={`rounded-2xl ${card} border overflow-hidden mb-6`}>
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {["all", "active", "inactive"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s as any)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                        filterStatus === s
                          ? "bg-white/10 text-white ring-1 ring-violet-500/40"
                          : "text-slate-400 hover:text-slate-300"
                      }`}>
                      {s === "all" ? "Tümü" : s === "active" ? "Aktif" : "Pasif"}
                    </button>
                  ))}
                </div>

                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 outline-none">
                  <option value="date">Yeniden</option>
                  <option value="scans">Taranan</option>
                  <option value="title">İsim</option>
                </select>

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-slate-400"}`}>
                    <List size={14}/>
                  </button>
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-400"}`}>
                    <LayoutGrid size={14}/>
                  </button>
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="p-6"><p className="text-slate-400">Yükleniyor...</p></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4">
                  <QrCode size={32} className="text-slate-700"/>
                  <p className="text-slate-400">QR kodunuz yok</p>
                  <button onClick={() => setActiveSection("create")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all">
                    <Plus size={14}/> QR Oluştur
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filtered.map(qr => (
                    <QRCard key={qr.id} qr={qr} selected={selected.has(qr.id)} isDark={isDark}
                      origin={publicOrigin}
                      onSelect={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}
                      onEdit={() => { setEditTarget(qr); setActiveSection("create"); }} 
                      onDelete={() => handleDelete(qr.id)}
                      onToggle={() => handleToggle(qr)}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filtered.map(qr => (
                    <div key={qr.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <button onClick={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}>
                          {selected.has(qr.id) ? <CheckSquare size={13} className="text-violet-500"/> : <Square size={13} className="text-slate-600"/>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{qr.title}</p>
                          <p className="text-[10px] text-slate-500">/q/{qr.short_slug}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-300 mr-4">{qr.scan_count.toLocaleString("tr-TR")}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditTarget(qr); setActiveSection("create"); }}
                          className="text-violet-500 hover:text-violet-400 text-xs">Düzenle</button>
                        <button onClick={() => handleDelete(qr.id)}
                          className="text-red-500 hover:text-red-400 text-xs">Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action */}
            <div className="flex justify-center">
              <button onClick={() => setActiveSection("create")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all">
                <Plus size={16}/> Yeni QR Oluştur
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

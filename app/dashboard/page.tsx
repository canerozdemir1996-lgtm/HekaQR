"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Plus, QrCode, BarChart2, Copy, Pencil, Trash2, Power,
  X, ExternalLink, Smartphone, Monitor, Tablet, TrendingUp,
  Activity, Search, Loader2, RefreshCw,
  Wand2, FileSpreadsheet, Star, Download, CheckSquare,
  Square, FileImage, FileText as FilePdf, Sun, Moon, LayoutGrid, List,
  Tag, Lock, MoreHorizontal, Check,
  Globe, AlertTriangle, Infinity as InfinityIcon, LogOut, Shield,
  ChevronDown, Zap, Users, Settings, HelpCircle, Home, Mail,
} from "lucide-react";
import {
  fetchQrCodes, fetchDashboardStats, fetchDailyStats,
  fetchDeviceStats, fetchRecentScans, deleteQrCode, bulkDeleteQrCodes,
  toggleActive, fetchStyles, type QrCode as QrCodeType, type DailyStats,
  type DeviceStats, type ScanLog, type QrStyle,
  getSupabase, getOrCreateSettings, updateSettings, type UserSettings,
  fetchFolders, createFolder, renameFolder, deleteFolder, type QrFolder,
  fetchUniqueScanCount,
} from "@/lib/supabase";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import { copyToClipboard } from "@/lib/clipboard";
import { TemplatesSection } from "@/components/TemplatesSection";
import { BulkSection } from "@/components/BulkSection";
import { ProfileMenu } from "@/components/ProfileMenu";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useToast } from "@/components/toast";
import { typography, colors, shadows, components, animations, spacing, breakpoints, a11y, states, gradients } from "@/lib/design-system-2026";
import { Button } from "@/lib/button-system-2026";


// ─── QR Grid Card ─────────────────────────────────────────────────────────────
function QRCard({ qr, selected, onSelect, onEdit, onDelete, onToggle, onStats, isDark, origin }: {
  qr: QrCodeType; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void; onStats: () => void; isDark: boolean;
  origin: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const TYPE_COLORS: Record<string, string> = {
    url: "#6366f1", product: "#f97316", vcard: "#8b5cf6", wifi: "#06b6d4", sms: "#10b981",
    email: "#f59e0b", whatsapp: "#25D366", text: "#64748b", phone: "#ef4444",
  };
  const typeColor = TYPE_COLORS[qr.qr_type ?? "url"] ?? "#6366f1";

  return (
    <div className={`group relative rounded-2xl border transition-all ${isDark
      ? selected ? "bg-violet-950/30 border-violet-500/50" : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.14]"
      : selected ? "bg-violet-50 border-violet-300" : "bg-white/80 border-slate-200 hover:border-slate-300 hover:shadow-md"
    } ${!qr.is_active ? "opacity-50" : ""} hover:-translate-y-[1px] hover:shadow-[0_18px_60px_rgba(0,0,0,0.22)]`}>

      {/* Top */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <button onClick={onSelect} className={`transition-colors ${isDark ? "text-slate-700 hover:text-violet-400" : "text-slate-300 hover:text-violet-500"}`}>
            {selected ? <CheckSquare size={13} className="text-violet-500"/> : <Square size={13}/>}
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${qr.is_active ? "bg-emerald-400" : isDark ? "bg-slate-700" : "bg-slate-300"}`}/>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${typeColor}18`, color: typeColor }}>
              {(qr.qr_type ?? "url").toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex justify-center mb-3">
          <QRThumb slug={qr.short_slug} style={qr.style_id ? _styleMapRef.get(qr.style_id) : null} origin={origin}/>
        </div>
        <p className={`font-semibold text-sm text-center truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}>{qr.title}</p>
        <p className={`text-[10px] font-mono text-center truncate mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>/q/{qr.short_slug}</p>
      </div>

      {/* Stats bar */}
      <div className={`px-4 py-2.5 border-t ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center justify-between`}>
        <button onClick={onStats} className={`text-lg font-black hover:text-violet-500 transition-colors ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {qr.scan_count.toLocaleString("tr-TR")}
        </button>
        <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>tarama</span>
      </div>

      {/* Actions */}
      <div className={`px-3 py-2.5 border-t ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center gap-1.5`}>
        <button onClick={onStats} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? "bg-white/5 hover:bg-white/8 text-slate-400" : "bg-slate-50 hover:bg-slate-100 text-slate-500"}`}>
          <BarChart2 size={11}/> Analiz
        </button>
        <button onClick={onEdit} className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-violet-400 hover:bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"}`}><Pencil size={12}/></button>
        <div className="relative">
          <button
            onClick={(e) => {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setAnchorRect(r);
              setMenuOpen(p => !p);
            }}
            className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-slate-300 hover:bg-white/8" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
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
              { icon: <FileImage size={11}/>, label: "PNG İndir", onClick: () => { void dlPng(qr, _styleMapRef, origin); } },
              { icon: <Download size={11}/>, label: "SVG İndir", onClick: () => { void dlSvg(qr, _styleMapRef, origin); } },
              { icon: <FilePdf size={11}/>, label: "PDF İndir", onClick: () => { void dlPdf(qr, _styleMapRef, origin); } },
              { icon: <Trash2 size={11}/>, label: "Sil", onClick: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();

  const [activeSection, setActiveSection] = useState<"qrlist"|"create"|"templates"|"bulk"|"analytics"|"settings"|"admin-users"|"admin-messages">("qrlist");
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<QrCodeType | null>(null);
  const [statsTarget, setStatsTarget] = useState<QrCodeType | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bartenderAdt, setBartenderAdt] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"date" | "scans" | "title">("date");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [styleMap, setStyleMap] = useState<Map<string, QrStyle>>(new Map());
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [foldersOpen, setFoldersOpen] = useState(false);

  // Theme classes
  const pg = "app-bg";
  const sidebar = isDark ? "glass-dark border-white/10" : "glass-light border-slate-200";
  const topbar = isDark ? "glass-dark border-white/10" : "glass-light border-slate-200";
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const inputCls = isDark
    ? "bg-white/5 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500"
    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400";

  // Auth check geçici olarak devre dışı bırakıldı
  useEffect(() => {
    setCurrentUserRole("user");
    setCurrentUserEmail("kullanici@example.com");
  }, []);

  const handleLogout = async () => {
    router.push("/login");
  };

  const load = useCallback(async () => {
    setLoading(true); setDbError("");
    try {
      const [codes, s, stylesArr, st, flds] = await Promise.all([
        fetchQrCodes(),
        fetchDashboardStats(),
        fetchStyles(),
        getOrCreateSettings(),
        fetchFolders(),
      ]);
      setQrs(codes); setStats(s);
      const sm = new Map(stylesArr.map(st => [st.id, st]));
      setStyleMap(sm);
      _styleMapRef = sm;
      setSettings(st);
      setFolders(flds);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hata";
      if (msg.includes("env") || msg.includes("fetch")) {
        setDbError("Supabase bağlantısı kurulamadı. .env.local dosyanızdaki NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini kontrol edin.");
      } else {
        setDbError(msg);
      }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Bu QR kodu silmek istiyor musunuz?")) return;
    try {
      const qr = qrs.find(q => q.id === id);
      await deleteQrCode(id);
      setQrs(p => p.filter(q => q.id !== id));
      setSelected(p => { const n = new Set(p); n.delete(id); return n; });
      setStats(p => ({ ...p, total_qr: Math.max(0, p.total_qr - 1), active_qr: qr?.is_active ? Math.max(0, p.active_qr - 1) : p.active_qr }));
      toast.success("QR kodu silindi.", "Başarılı");
    } catch (e) { alert("Silme hatası: " + (e instanceof Error ? e.message : "Hata")); }
  }, [qrs, toast]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`${selected.size} QR kodunu silmek istiyor musunuz?`)) return;
    setBulkLoading(true);
    try { await bulkDeleteQrCodes(Array.from(selected)); setQrs(p => p.filter(q => !selected.has(q.id))); setSelected(new Set()); }
    finally { setBulkLoading(false); }
  }, [selected]);

  const handleBartenderExport = useCallback(async () => {
    const origin = getPublicOrigin(settings);
    const selectedRows = qrs.filter(q => selected.has(q.id));
    if (selectedRows.length === 0) {
      toast.error("Önce en az 1 QR seçin.", "BarTender Export");
      return;
    }
    const rows: BartenderRow[] = selectedRows.map((q) => ({
      SKU: (q.notes ?? "").trim() || (q.tags?.[0] ?? "").trim() || q.short_slug || q.id,
      "ÜRÜN ADI": q.title || "QR",
      // BarTender için direkt image (PNG) döndüren endpoint URL'si
      "QR DOSYA ADI": `${origin}/api/v1/qrcodes/render?slug=${encodeURIComponent(String(q.short_slug))}&format=png&size=600`,
      ADT: bartenderAdt,
    }));
    try {
      await exportBartenderSheet(rows);
      toast.success(`${rows.length} kayıt BarTender formatında indirildi.`, "Başarılı");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export hatası", "BarTender Export");
    }
  }, [qrs, selected, settings, toast, bartenderAdt]);

  const handleToggle = useCallback(async (qr: QrCodeType) => {
    try {
      await toggleActive(qr.id, !qr.is_active);
      setQrs(p => p.map(q => q.id === qr.id ? { ...q, is_active: !qr.is_active } : q));
      setStats(p => ({ ...p, active_qr: p.active_qr + (qr.is_active ? -1 : 1) }));
    } catch { /* noop */ }
  }, []);

  const handleSuccess = useCallback((created: QrCodeType) => {
    if (editTarget) { setQrs(p => p.map(q => q.id === created.id ? created : q)); }
    else { setQrs(p => [created, ...p]); setStats(p => ({ ...p, total_qr: p.total_qr + 1, active_qr: created.is_active ? p.active_qr + 1 : p.active_qr })); }
    setActiveSection("qrlist"); setEditTarget(null);
    toast.success(editTarget ? "QR kodu güncellendi." : "QR kodu oluşturuldu.", "Başarılı");
    if (!editTarget && created.qr_type === "vcard") {
      toast.info("vCard builder açılıyor…");
      router.push(`/dashboard/vcard-builder?id=${created.id}`);
    }
  }, [editTarget, toast, router]);

  const filtered = qrs
    .filter(q => {
      const ms = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.short_slug.toLowerCase().includes(search.toLowerCase());
      const mst = filterStatus === "all" || (filterStatus === "active" ? q.is_active : !q.is_active);
      const mf = folderFilter === "all"
        || (folderFilter === "none" ? !q.folder_id : q.folder_id === folderFilter);
      return ms && mst && mf;
    })
    .sort((a, b) => {
      if (sortBy === "scans") return b.scan_count - a.scan_count;
      if (sortBy === "title") return a.title.localeCompare(b.title, "tr");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const publicOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getPublicOrigin(settings);
  }, [settings]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    setSavingSettings(true); setSettingsMsg("");
    try {
      const updated = await updateSettings({
        custom_domain: settings.custom_domain ? normalizeCustomDomain(settings.custom_domain) : null,
        ga4_measurement_id: settings.ga4_measurement_id?.trim() || null,
        gtm_container_id: settings.gtm_container_id?.trim() || null,
        webhook_url: settings.webhook_url?.trim() || null,
      });
      setSettings(updated);
      setSettingsMsg("Kaydedildi");
      setTimeout(() => setSettingsMsg(""), 2500);
      toast.success("Ayarlar kaydedildi.", "Başarılı");
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : "Hata");
      toast.error(e instanceof Error ? e.message : "Ayarlar kaydedilemedi.", "Hata");
    } finally {
      setSavingSettings(false);
    }
  }, [settings, toast]);

  // Sidebar nav items
  type NavItem = { icon: React.ReactNode; label: string; section: "analytics" | "templates" | "qrlist" | "bulk" | "settings" | "create" | "admin-users" | "admin-messages" | null; href?: string; adminOnly?: boolean };
  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "QR KODLARIM",
      items: [
        { icon: <List size={15}/>, label: "QR Listesi", section: "qrlist" },
        { icon: <Plus size={15}/>, label: "Yeni QR Oluştur", section: "create" },
        { icon: <BarChart2 size={15}/>, label: "Analitik", section: "analytics" },
        { icon: <Star size={15}/>, label: "Şablonlar", section: "templates" },
      ]
    },
    {
      label: "ARAÇLAR",
      items: [
        { icon: <FileSpreadsheet size={15}/>, label: "Toplu Yükleme", section: "bulk" },
        { icon: <FilePdf size={15}/>, label: "BarTender", section: null, href: "/dashboard/bartender" },
        { icon: <Mail size={15}/>, label: "Mesajlar", section: null, href: "/dashboard/messages" },
      ]
    },
    ...(currentUserRole === "admin" || currentUserRole === "owner" ? [{
      label: "ADMİN",
      items: [
        { icon: <Users size={15}/>, label: "Kullanıcılar", section: "admin-users", adminOnly: true },
        { icon: <Mail size={15}/>, label: "Sistem Mesajları", section: "admin-messages", adminOnly: true },
      ]
    }] : []),
    {
      label: "AYARLAR",
      items: [
        { icon: <Settings size={15}/>, label: "Ayarlar", section: "settings" },
      ]
    },
  ];

  // const statCards = [
  //   { label: "Toplam QR", value: stats.total_qr, icon: <QrCode size={16}/>, color: "#7c3aed" },
  //   { label: "Aktif", value: stats.active_qr, icon: <Activity size={16}/>, color: "#10b981" },
  //   { label: "Toplam Tarama", value: stats.total_scans, icon: <TrendingUp size={16}/>, color: "#f59e0b" },
  //   { label: "Bugün", value: stats.scans_today, icon: <Zap size={16}/>, color: "#ec4899" },
  // ];

  const statCards = [
    { label: "Toplam QR", value: stats.total_qr, icon: <QrCode size={16}/>, color: colors.primary[500] },
    { label: "Aktif", value: stats.active_qr, icon: <Activity size={16}/>, color: colors.success[500] },
    { label: "Toplam Tarama", value: stats.total_scans, icon: <TrendingUp size={16}/>, color: colors.warning[500] },
    { label: "Bugün", value: stats.scans_today, icon: <Zap size={16}/>, color: colors.secondary[500] },
  ];

  return (
    <div className={`${pg} min-h-screen`}>
      {/* ── TOP BAR (2026: Glassmorphism + Smooth Transitions) ─────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 
        ${components.glass[isDark ? 'dark' : 'light']} border-b ${isDark ? 'border-white/10' : 'border-white/20'} 
        backdrop-blur-2xl transition-all duration-300 ${animations.smooth}`}>
        
        {/* Logo - Enhanced with glow and animation */}
        <Link href="/" className="flex items-center gap-3 w-56 shrink-0 group">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 flex items-center justify-center 
            ${shadows.glow.primary} group-hover:shadow-lg
            transition-all duration-300 group-hover:scale-110 ${animations.smooth}`}>
            <QrCode size={15} className="text-white"/>
          </div>
          <span className={`${typography.heading.sm} ${tx} group-hover:opacity-80 transition-opacity`}>
            QR<span className="text-violet-500">Hub</span>
          </span>
        </Link>

        {/* Search - With glass effect and smooth focus */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative group">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} group-focus-within:text-violet-500 transition-colors`}/>
            <input
              placeholder="QR kodlarında ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-tour="search"
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none 
                ${isDark 
                  ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:bg-white/10" 
                  : "bg-white/40 border-white/20 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/60"
                }
                transition-all duration-300 backdrop-blur-sm`}
            />
            <p className={`text-[10px] mt-1 ${sub} opacity-0 group-focus-within:opacity-100 transition-opacity duration-200`}>
              💡 Başlık veya slug ile arayabilirsiniz
            </p>
          </div>
        </div>

        {/* Right - Theme toggle & Admin link */}
        <div className="flex items-center gap-2 w-56 justify-end">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all duration-300 
              ${isDark 
                ? "border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/30 hover:bg-yellow-500/5" 
                : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              } hover:scale-110 active:scale-95`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          {(currentUserRole === "admin" || currentUserRole === "owner") && (
            <Link href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold 
                transition-all duration-300 hover:scale-105 active:scale-95
                ${isDark 
                  ? "border-violet-800/40 text-violet-400 hover:bg-violet-900/20 hover:border-violet-700/60 hover:shadow-glow-primary" 
                  : "border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"}`}>
              <Shield size={12}/> Admin
            </Link>
          )}
          <ProfileMenu email={currentUserEmail} role={currentUserRole} isDark={isDark} onLogout={handleLogout} avatarUrl={settings?.avatar_url ?? null}/>
        </div>
      </header>

      <div className="flex pt-14 flex-1">

        {/* ── SIDEBAR (2026: Neumorphism + Enhanced Interactions) ─────────────────────── */}
        <aside className={`fixed left-0 top-14 bottom-0 w-56 border-r flex flex-col z-30 overflow-y-auto 
          ${components.glass[isDark ? 'dark' : 'light']} border-r ${isDark ? 'border-white/10' : 'border-white/20'} 
          backdrop-blur-2xl ${animations.smooth}`}>
          
          {/* Create button - Premium gradient with glow */}
          <div className="p-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              glow
              animated
              icon={<Plus size={16}/>}
              onClick={() => setActiveSection("create")}
              className={`${animations.fadeIn} ${shadows.glow.primary} hover:${shadows.glow.primary}`}
            >
              Yeni QR Oluştur
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 pb-4 space-y-5">
            {navGroups.map(group => (
              <div key={group.label}>
                <p className={`${typography.label.xs} px-2 mb-1.5 ${sub}`}>{group.label}</p>
                {group.items.map(item => {
                  const isActive = item.section ? activeSection === item.section : false;
                  if (item.href) {
                    return (
                      <a key={item.label} href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${animations.smooth} mb-0.5 ${isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
                        {item.icon}<span>{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <button key={item.label} onClick={() => item.section && setActiveSection(item.section as "qrlist"|"create"|"templates"|"bulk"|"analytics"|"settings"|"admin-users"|"admin-messages")}
                      data-tour={item.section === "analytics" ? "nav-analytics" : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${animations.smooth} mb-0.5 ${
                        isActive
                          ? `${components.button.primary} font-semibold shadow-sm`
                          : isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`}>
                      {item.icon}<span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User */}
          <div className={`p-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 border border-white/10">
                {settings?.avatar_url
                  ? <Image src={String(settings.avatar_url)} alt="avatar" width={28} height={28} className="w-7 h-7 object-cover" unoptimized />
                  : <span className="text-white text-[10px] font-black">{(currentUserEmail[0] ?? "U").toUpperCase()}</span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold truncate ${tx}`}>{currentUserEmail || "Kullanıcı"}</p>
                <p className={`text-[9px] capitalize ${sub}`}>{currentUserRole || "user"}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <main className="ml-56 flex-1 p-6 space-y-5">

          {/* DB Error */}
          {dbError && (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${isDark ? "bg-red-950/30 border-red-900/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold text-sm">Veritabanı bağlantı hatası</p>
                <p className="text-xs mt-0.5 opacity-80">{dbError}</p>
              </div>
            </div>
          )}

          {/* SECTION ROUTING */}
          {activeSection === "templates" && (
            <TemplatesSection isDark={isDark} onBack={() => setActiveSection("qrlist")}/>
          )}
          {activeSection === "bulk" && (
            <BulkSection isDark={isDark} onBack={() => setActiveSection("qrlist")}/>
          )}
          {activeSection === "analytics" && (
            <div className={`rounded-2xl ${card} p-6`}>
              <p className={`text-[10px] font-black tracking-widest ${sub}`}>ANALİTİK</p>
              <h2 className={`text-lg font-black mt-1 ${tx}`}>Genel görünüm</h2>
              <p className={`text-sm mt-1 ${sub}`}>Detaylı analitik için listeden bir QR’ın tarama sayısına tıklayın.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {[
                  { l: "Toplam QR", v: stats.total_qr, c: "#7c3aed" },
                  { l: "Aktif QR", v: stats.active_qr, c: "#10b981" },
                  { l: "Toplam Tarama", v: stats.total_scans, c: "#f59e0b" },
                  { l: "Bugün", v: stats.scans_today, c: "#ec4899" },
                ].map(k => (
                  <div key={k.l} className={`rounded-xl p-3 border ${isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{k.l}</p>
                    <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSection === "create" && (
            <CreateQRModal
              editing={editTarget}
              theme={theme}
              onClose={() => { setActiveSection("qrlist"); setEditTarget(null); }}
              onSuccess={handleSuccess}
            />
          )}
          {activeSection === "admin-users" && currentUserRole && (currentUserRole === "admin" || currentUserRole === "owner") && (
            <div className={`rounded-2xl border ${card} p-6`}>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className={`text-[10px] font-black tracking-widest ${sub}`}>ADMİN</p>
                  <h2 className={`text-lg font-black mt-1 ${tx}`}>Kullanıcı Yönetimi</h2>
                  <p className={`text-sm mt-1 ${sub}`}>Sistem kullanıcılarını yönetin ve izinleri kontrol edin.</p>
                </div>
              </div>
              <div className={`p-4 border rounded-xl ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                <p className="text-sm font-semibold">Admin paneline erişim için /admin sayfasını ziyaret edin</p>
                <p className="text-xs mt-1 opacity-80">Tam kullanıcı ve sistem yönetimi için admin panelini kullanın.</p>
              </div>
            </div>
          )}
          {activeSection === "admin-messages" && currentUserRole && currentUserRole === "owner" && (
            <div className={`rounded-2xl border ${card} p-6`}>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className={`text-[10px] font-black tracking-widest ${sub}`}>ADMİN</p>
                  <h2 className={`text-lg font-black mt-1 ${tx}`}>Sistem Mesajları</h2>
                  <p className={`text-sm mt-1 ${sub}`}>Kullanıcılara popup mesajları gönderin.</p>
                </div>
              </div>
              <div className={`p-4 border rounded-xl ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                <p className="text-sm font-semibold">Sistem mesajları için /admin/messages sayfasını ziyaret edin</p>
                <p className="text-xs mt-1 opacity-80">Detaylı mesaj geçmişi ve yönetimi için admin panelini kullanın.</p>
              </div>
            </div>
          )}
          {activeSection === "settings" && (
            <div className={`rounded-2xl border ${card} p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[10px] font-black tracking-widest ${sub}`}>AYARLAR</p>
                  <h2 className={`text-lg font-black mt-1 ${tx}`}>White‑label & Entegrasyonlar</h2>
                  <p className={`text-sm mt-1 ${sub}`}>Bu ayarlar QR linklerini ve tarama tracking’ini etkiler.</p>
                </div>
                {settingsMsg && (
                  <span className={`text-xs font-semibold ${settingsMsg === "Kaydedildi" ? "text-emerald-400" : "text-amber-400"}`}>{settingsMsg}</span>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs font-bold ${tx}`}>Custom Domain</p>
                  <p className={`text-[11px] mt-1 ${sub}`}>Örn: <span className="font-mono">q.sirketiniz.com</span> → linkler bu domain ile üretilecek.</p>
                  <input
                    value={settings?.custom_domain ?? ""}
                    onChange={(e) => setSettings(p => p ? { ...p, custom_domain: e.target.value } : p)}
                    placeholder="q.sirketiniz.com"
                    className={`mt-3 w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus-premium ${inputCls} font-mono`}
                  />
                  <p className={`text-[11px] mt-2 ${sub}`}>Not: DNS/Domain yönlendirmesi Vercel’de yapılmalıdır.</p>
                </div>

                <div className={`rounded-xl border p-4 ${isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs font-bold ${tx}`}>GA4 / GTM Varsayılanları</p>
                  <p className={`text-[11px] mt-1 ${sub}`}>QR’da ayrıca girilmezse bridge sayfası bu ID’leri kullanabilir.</p>
                  <div className="mt-3 space-y-2.5">
                    <input
                      value={settings?.ga4_measurement_id ?? ""}
                      onChange={(e) => setSettings(p => p ? { ...p, ga4_measurement_id: e.target.value } : p)}
                      placeholder="GA4: G-XXXXXXXXXX"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus-premium ${inputCls} font-mono`}
                    />
                    <input
                      value={settings?.gtm_container_id ?? ""}
                      onChange={(e) => setSettings(p => p ? { ...p, gtm_container_id: e.target.value } : p)}
                      placeholder="GTM: GTM-XXXXXXX"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus-premium ${inputCls} font-mono`}
                    />
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs font-bold ${tx}`}>Webhook Varsayılanı</p>
                  <p className={`text-[11px] mt-1 ${sub}`}>Her taramada otomasyon sistemine bildirim göndermek için.</p>
                  <input
                    value={settings?.webhook_url ?? ""}
                    onChange={(e) => setSettings(p => p ? { ...p, webhook_url: e.target.value } : p)}
                    placeholder="https://example.com/webhook"
                    className={`mt-3 w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus-premium ${inputCls} font-mono`}
                  />
                  <p className={`text-[11px] mt-2 ${sub}`}>Payload: <span className="font-mono">{`{ event:"qr_scan", qr_id, slug, device, os, country }`}</span></p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={!settings || savingSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 btn-premium focus-premium"
                >
                  {savingSettings ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                  Kaydet
                </button>
              </div>
            </div>
          )}
          {false && null}

          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl font-black ${tx}`}>QR Kodlarım</h1>
              <p className={`text-sm ${sub} mt-0.5`}>{stats.total_qr} adet QR kodu</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-500 hover:text-slate-300" : "border-slate-200 text-slate-400 hover:text-slate-600"}`}>
                <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
              </button>
              <button onClick={() => setActiveSection("create")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all btn-premium focus-premium">
                <Plus size={14}/> Yeni QR
              </button>
            </div>
          </div>

          {/* Stats (2026: Glassmorphism + Glow Effects) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
            {statCards.map(s => (
              <div key={s.label} 
                className={`rounded-2xl border p-4 flex items-center gap-3 
                  transition-all duration-300 group hover:scale-105 active:scale-95
                  ${isDark 
                    ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-glow-primary" 
                    : "bg-white/40 border-white/30 hover:bg-white/60 hover:border-white/50 hover:shadow-lg"
                  }
                  backdrop-blur-md hover:backdrop-blur-xl cursor-default`}>
                
                {/* Icon with animated background */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                  transition-all duration-300 group-hover:scale-110
                  ${isDark ? "bg-white/10" : "bg-white/30"}`} 
                  style={{ color: s.color }}>
                  {s.icon}
                </div>
                
                {/* Value section */}
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${sub} opacity-80`}>
                    {s.label}
                  </p>
                  <p className={`text-2xl font-black ${tx} group-hover:translate-x-1 transition-transform`}>
                    {s.value.toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* QR Table */}
          <div className={`rounded-2xl ${card} overflow-hidden`}>

            {/* Toolbar */}
            <div className={`px-5 py-3 border-b ${isDark ? "border-white/[0.06]" : "border-slate-100"} flex items-center gap-3 flex-wrap sticky top-14 z-20 ${isDark ? "bg-[#070914]/55" : "bg-white/70"} backdrop-blur-2xl`}>
              {/* Status filter pills */}
              <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${isDark ? "bg-white/[0.03] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                {(["all", "active", "inactive"] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${filterStatus === s
                      ? (isDark ? "bg-white/10 text-white shadow-sm ring-1 ring-violet-500/40" : "bg-white text-slate-800 shadow-sm ring-1 ring-violet-500/30")
                      : `${sub} hover:${isDark ? "text-slate-300" : "text-slate-600"}`}`}>
                    {s === "all" ? "Tümü" : s === "active" ? "Aktif" : "Pasif"}
                  </button>
                ))}
              </div>

              {/* Folder filter */}
              <div className="flex items-center gap-2">
                <select value={folderFilter} onChange={e => setFolderFilter(e.target.value)}
                  className={`text-xs border rounded-xl px-3 py-2 outline-none transition-all cursor-pointer focus-premium ${isDark ? "bg-white/5 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>
                  <option value="all">Tüm klasörler</option>
                  <option value="none">Klasörsüz</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button onClick={() => setFoldersOpen(true)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-violet-300 hover:border-violet-500/30" : "border-slate-200 text-slate-500 hover:border-violet-400"}`}>
                  Klasörler
                </button>
                <span className={`text-[10px] ${sub}`}>Kampanya bazlı filtre</span>
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className={`text-xs border rounded-xl px-3 py-2 outline-none transition-all cursor-pointer focus-premium ${isDark ? "bg-white/5 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>
                <option value="date">Yeniden eskiye</option>
                <option value="scans">En çok taranan</option>
                <option value="title">İsme göre</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                {/* Bulk actions */}
                {selected.size > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? "bg-violet-950/30 border-violet-800/30" : "bg-violet-50 border-violet-200"}`}>
                    <span className={`text-xs font-bold ${isDark ? "text-violet-300" : "text-violet-700"}`}>{selected.size} seçili</span>
                    <div className="flex items-center gap-2 ml-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>ADT</span>
                      <input
                        type="number"
                        min={1}
                        value={bartenderAdt}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setBartenderAdt(Number.isFinite(v) && v > 0 ? v : 1);
                        }}
                        className={`w-20 text-xs rounded-lg px-2 py-1.5 border outline-none transition-all focus:border-violet-400 ${isDark ? "bg-white/5 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                      />
                    </div>
                    <button onClick={() => { filtered.filter(q => selected.has(q.id)).forEach(q => dlPng(q, styleMap, publicOrigin)); }}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-indigo-300" : "border-slate-200 text-slate-500"}`}>
                      <FileImage size={10}/> PNG
                    </button>
                    <button onClick={() => { filtered.filter(q => selected.has(q.id)).forEach(q => dlSvg(q, styleMap, publicOrigin)); }}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-emerald-300" : "border-slate-200 text-slate-500"}`}>
                      <Download size={10}/> SVG
                    </button>
                    <button onClick={() => void handleBartenderExport()}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-violet-300" : "border-slate-200 text-slate-500"}`}>
                      <FileSpreadsheet size={10}/> BarTender
                    </button>
                    <button onClick={handleBulkDelete} disabled={bulkLoading}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                      {bulkLoading ? <Loader2 size={10} className="animate-spin"/> : <Trash2 size={10}/>} Sil
                    </button>
                    <button onClick={() => setSelected(new Set())} className={`${sub} hover:text-red-400`}><X size={12}/></button>
                  </div>
                )}

                {/* View toggle */}
                <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${isDark ? "bg-white/[0.03] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list"
                      ? (isDark ? "bg-white/10 text-white ring-1 ring-violet-500/40" : "bg-white text-slate-800 ring-1 ring-violet-500/30")
                      : sub}`}
                  >
                    <List size={12}/>
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid"
                      ? (isDark ? "bg-white/10 text-white ring-1 ring-violet-500/40" : "bg-white text-slate-800 ring-1 ring-violet-500/30")
                      : sub}`}
                  >
                    <LayoutGrid size={12}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Results info */}
            <div className={`px-5 py-2.5 border-b ${isDark ? "border-slate-800/60" : "border-slate-100"} flex items-center justify-between`}>
              <p className={`text-xs ${sub}`}>{filtered.length} QR kodu gösteriliyor</p>
              {filtered.length > 0 && (
                <button onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(q => q.id)))}
                  className="text-xs text-violet-500 hover:text-violet-400 transition-colors font-medium">
                  {selected.size === filtered.length ? "Seçimi kaldır" : "Tümünü seç"}
                </button>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-5">
                <div className={`hidden md:flex items-center gap-4 px-5 py-2.5 rounded-xl mb-3 ${isDark ? "bg-white/[0.02] border border-white/[0.06]" : "bg-white/80 border border-slate-200"}`}>
                  <div className="w-4 shrink-0 h-3 rounded bg-white/5"/>
                  <div className="w-14 shrink-0 hidden sm:block h-3 rounded bg-white/5"/>
                  <div className="flex-1 h-3 rounded bg-white/5"/>
                  <div className="w-24 hidden md:block h-3 rounded bg-white/5"/>
                  <div className="w-20 text-right hidden sm:block h-3 rounded bg-white/5"/>
                  <div className="w-16 text-right hidden lg:block h-3 rounded bg-white/5"/>
                  <div className="w-24 text-right h-3 rounded bg-white/5"/>
                </div>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`group flex items-center gap-4 px-5 py-3.5 rounded-xl mb-2 border ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-white/80"} animate-fadeup`}>
                    <div className="w-4 h-4 rounded bg-white/5"/>
                    <div className="w-14 h-14 rounded-xl bg-white/5 hidden sm:block"/>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-56 max-w-[70%] rounded bg-white/5"/>
                      <div className="h-3 w-72 max-w-[85%] rounded bg-white/5"/>
                    </div>
                    <div className="w-24 h-6 rounded bg-white/5 hidden md:block"/>
                    <div className="w-20 space-y-2 hidden sm:block">
                      <div className="h-4 rounded bg-white/5"/>
                      <div className="h-3 rounded bg-white/5"/>
                    </div>
                    <div className="w-24 h-8 rounded bg-white/5"/>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? "bg-white/[0.03] border border-slate-800" : "bg-slate-100"}`}>
                  <QrCode size={28} className={sub}/>
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {search || filterStatus !== "all" ? "Sonuç bulunamadı" : "Henüz QR kodunuz yok"}
                  </p>
                  <p className={`text-sm ${sub} mt-1`}>{!search && filterStatus === "all" ? "İlk QR kodunuzu oluşturun" : "Filtreleri değiştirmeyi deneyin"}</p>
                </div>
                {!search && filterStatus === "all" && (
                  <button onClick={() => setActiveSection("create")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all btn-premium focus-premium">
                    <Plus size={14}/> QR Kodu Oluştur
                  </button>
                )}
              </div>
            ) : viewMode === "list" ? (
              <div>
                {/* Table header */}
                <div className={`hidden md:flex items-center gap-4 px-5 py-2.5 sticky top-[126px] z-10 ${isDark ? "bg-[#070914]/55 border-b border-white/[0.06]" : "bg-white/70 border-b border-slate-100"} backdrop-blur-2xl`}>
                  <div className="w-4 shrink-0"/>
                  <div className="w-14 shrink-0 hidden sm:block"/>
                  <div className="flex-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>QR Kodu / URL</span>
                  </div>
                  <div className="w-24 hidden md:block">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Tür</span>
                  </div>
                  <div className="w-20 text-right hidden sm:block">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Tarama</span>
                  </div>
                  <div className="w-16 text-right hidden lg:block">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Tarih</span>
                  </div>
                  <div className="w-24 text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>İşlemler</span>
                  </div>
                </div>
                {filtered.map(qr => (
                  <QRRow key={qr.id} qr={qr} selected={selected.has(qr.id)} isDark={isDark}
                    origin={publicOrigin}
                    onSelect={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}
                    onEdit={() => { setEditTarget(qr); setActiveSection("create"); }} onDelete={() => handleDelete(qr.id)}
                    onToggle={() => handleToggle(qr)} onStats={() => setStatsTarget(qr)}/>
                ))}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(qr => (
                  <QRCard key={qr.id} qr={qr} selected={selected.has(qr.id)} isDark={isDark}
                    origin={publicOrigin}
                    onSelect={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}
                    onEdit={() => { setEditTarget(qr); setActiveSection("create"); }} onDelete={() => handleDelete(qr.id)}
                    onToggle={() => handleToggle(qr)} onStats={() => setStatsTarget(qr)}/>
                ))}
              </div>
            )}
          </div>
          </>)}
        </main>
      </div>

      {/* Modals */}
      {statsTarget && (
        <AnalyticsDrawer qr={statsTarget} onClose={() => setStatsTarget(null)} isDark={isDark} styleMap={styleMap} origin={publicOrigin}/>
      )}

      {/* Folder manager modal */}
      {foldersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFoldersOpen(false)}/>
          <div className={`relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-2xl ${isDark ? "bg-[#0c0f1a] border-white/10" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-[10px] font-black tracking-widest ${sub}`}>KLASÖRLER</p>
                <h3 className={`font-black text-base ${tx}`}>Kampanya yönetimi</h3>
              </div>
              <button onClick={() => setFoldersOpen(false)} className={`${sub} hover:text-red-400`}><X size={16}/></button>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  const name = prompt("Yeni klasör adı");
                  if (!name?.trim()) return;
                  const created = await createFolder(name.trim());
                  setFolders(p => [created, ...p]);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? "border-white/10 text-slate-300 hover:border-violet-500/30 hover:text-violet-300" : "border-slate-200 text-slate-600 hover:border-violet-400"}`}
              >
                <Plus size={14}/> Yeni klasör
              </button>

              <div className={`rounded-xl border overflow-hidden ${isDark ? "border-white/[0.07]" : "border-slate-200"}`}>
                {folders.length === 0 ? (
                  <div className={`p-4 text-sm ${sub}`}>Henüz klasör yok.</div>
                ) : folders.map(f => (
                  <div key={f.id} className={`flex items-center justify-between px-4 py-3 ${isDark ? "border-b border-white/[0.05]" : "border-b border-slate-100"} last:border-b-0`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${tx}`}>{f.name}</p>
                      <p className={`text-[10px] ${sub}`}>{new Date(f.created_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          const name = prompt("Klasör adını değiştir", f.name);
                          if (!name?.trim() || name.trim() === f.name) return;
                          await renameFolder(f.id, name.trim());
                          setFolders(p => p.map(x => x.id === f.id ? { ...x, name: name.trim() } : x));
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-violet-300" : "border-slate-200 text-slate-500 hover:text-violet-600"}`}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`"${f.name}" klasörü silinsin mi?`)) return;
                          await deleteFolder(f.id);
                          setFolders(p => p.filter(x => x.id !== f.id));
                          setFolderFilter(cur => cur === f.id ? "all" : cur);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className={`text-[11px] ${sub}`}>Not: Bir klasör silinirse, QR’lar klasörsüz kalır.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

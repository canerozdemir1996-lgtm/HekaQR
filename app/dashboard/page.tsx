"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Plus, QrCode, Pencil, Trash2, Power, X, Loader2, RefreshCw,
  CheckSquare, Square, BarChart2, Zap, Activity, TrendingUp,
  Sun, Moon, LayoutGrid, List, LogOut, Settings, AlertTriangle,
  Search, MoreHorizontal, Wand2, Sparkles, FolderKanban, ShieldAlert,
  Download, Copy, ExternalLink, FileImage, FileText, ShoppingBag, Eye, Crown, Building2,
  ClipboardList, ChevronLeft, ChevronRight, CalendarCheck
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/lib/button-system-2026";
import BrandLogo from "@/components/BrandLogo";
import {
  fetchQrCodes,
  fetchDashboardStats,
  fetchFolders,
  fetchStyles,
  getOrCreateSettings,
  createFolder,
  deleteFolder,
  deleteQrCode,
  updateQrCode,
  toggleActive,
  QR_TYPE_LABELS,
  type QrCode as QrCodeType,
  type QrFolder,
  type QrStyle,
  type UserSettings,
} from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useToast } from "@/components/toast";
import { copyToClipboard } from "@/lib/clipboard";

function appOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/+$/, "");
}

function qrLink(slug: string, customDomain?: string | null) {
  const origin = customDomain ? `https://${customDomain}` : appOrigin();
  return `${origin}/q/${encodeURIComponent(slug)}`;
}

function qrRenderUrl(qr: QrCodeType, format: "png" | "svg" = "png", size = 720) {
  const version = encodeURIComponent(qr.style_id ?? qr.updated_at ?? qr.id);
  return `${appOrigin()}/api/v1/qrcodes/render?slug=${encodeURIComponent(qr.short_slug)}&format=${format}&size=${size}&v=${version}`;
}

async function fetchPendingMenuOrderCount() {
  const response = await fetch("/api/v1/menu-orders?scope=all&status=new&limit=20&page=1", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return 0;
  const body = await response.json().catch(() => ({}));
  if (typeof body?.pagination?.total === "number") return body.pagination.total;
  const orders = Array.isArray(body.orders) ? body.orders : [];
  return orders.filter((order: { status?: string }) => order.status === "new").length;
}

function qrTypeLabel(qr: QrCodeType) {
  if ((qr.dynamic_content as any)?.kind === "menu") return "Menü QR";
  if ((qr.dynamic_content as any)?.kind === "multi") return QR_TYPE_LABELS.multi.label;
  if (!qr.qr_type) return "URL";
  return QR_TYPE_LABELS[qr.qr_type as keyof typeof QR_TYPE_LABELS]?.label ?? qr.qr_type;
}

function planLabel(plan?: string | null) {
  const normalized = (plan || "free").toLowerCase();
  const labels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };
  return labels[normalized] ?? normalized.toUpperCase();
}

function statusLabel(status?: string | null) {
  const normalized = (status || "free").toLowerCase();
  const labels: Record<string, string> = {
    active: "Aktif",
    trial: "Deneme",
    trialing: "Deneme",
    past_due: "Ödeme bekliyor",
    paused: "Duraklatıldı",
    unpaid: "Ödeme başarısız",
    expired: "Süresi doldu",
    cancelled: "İptal",
    free: "Free",
  };
  return labels[normalized] ?? normalized;
}

function billingLabel(cycle?: string | null) {
  return cycle === "yearly" ? "Yıllık" : "Aylık";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function safeFileName(value: string) {
  return (value || "heka-qr").trim().toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-").replace(/^-+|-+$/g, "") || "heka-qr";
}

const TRASH_TAG = "__trash";
const TRASH_AT_PREFIX = "__trash_at:";

function isTrashed(qr: QrCodeType) {
  return (qr.tags ?? []).includes(TRASH_TAG);
}

function trashDate(qr: QrCodeType) {
  const raw = (qr.tags ?? []).find(tag => tag.startsWith(TRASH_AT_PREFIX))?.slice(TRASH_AT_PREFIX.length);
  return raw ? new Date(raw) : null;
}

function trashTags(qr: QrCodeType) {
  const base = (qr.tags ?? []).filter(tag => tag !== TRASH_TAG && !tag.startsWith(TRASH_AT_PREFIX));
  return [...base, TRASH_TAG, `${TRASH_AT_PREFIX}${new Date().toISOString()}`];
}

function restoreTags(qr: QrCodeType) {
  return (qr.tags ?? []).filter(tag => tag !== TRASH_TAG && !tag.startsWith(TRASH_AT_PREFIX));
}

function trashExpired(qr: QrCodeType) {
  const date = trashDate(qr);
  return !!date && Date.now() - date.getTime() > 7 * 24 * 60 * 60 * 1000;
}

async function downloadQr(qr: QrCodeType, format: "png" | "svg") {
  const response = await fetch(qrRenderUrl(qr, format, 1200));
  if (!response.ok) throw new Error("QR indirilemedi.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(qr.title)}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadQrPdf(qr: QrCodeType) {
  const response = await fetch(`${appOrigin()}/api/v1/qrcodes/pdf?slug=${encodeURIComponent(qr.short_slug)}`);
  if (!response.ok) throw new Error("PDF oluşturulamadı.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(qr.title)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadBulkQrPdf(qrs: QrCodeType[]) {
  const slugs = qrs.map(qr => qr.short_slug).join(",");
  const response = await fetch(`${appOrigin()}/api/v1/qrcodes/pdf?slugs=${encodeURIComponent(slugs)}`);
  if (!response.ok) throw new Error("PDF oluşturulamadı.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "qr-publish-toplu.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function QRPreview({ qr, size = "md", onOpen }: { qr: QrCodeType; size?: "sm" | "md" | "lg"; onOpen?: () => void }) {
  const px = size === "lg" ? "h-48 w-48" : size === "sm" ? "h-24 w-24" : "h-32 w-32";
  const body = (
    <img
      src={qrRenderUrl(qr, "png", size === "lg" ? 720 : 360)}
      alt={`${qr.title} QR kodu`}
      className="h-full w-full object-contain"
      loading="lazy"
    />
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); onOpen(); } }}
        className={`group/preview relative shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-inner transition hover:border-violet-400 hover:shadow-lg dark:border-white/10 ${px}`}
        title="Büyük önizleme"
      >
        {body}
        <span className="pointer-events-none absolute inset-2 hidden items-center justify-center rounded-xl bg-slate-950/55 text-white group-hover/preview:flex">
          <Eye size={18} />
        </span>
      </button>
    );
  }
  return (
    <div className={`shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-inner dark:border-white/10 ${px}`}>
      {body}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2026 PREMIUM DESIGN COMPONENTS
// ─────────────────────────────────────────────────────────────

/** 2026 Premium Glassmorphic QR Card */
function QRCardPremium({
  qr, onEdit, onDelete, onToggle, onAnalytics, onCopy, onDownload, onPdf, onPreview, selected, onSelect, delay, customDomain
}: {
  qr: QrCodeType;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onAnalytics: () => void;
  onCopy: () => void;
  onDownload: (format: "png" | "svg") => void;
  onPdf: () => void;
  onPreview: () => void;
  selected: boolean;
  onSelect: () => void;
  delay: number;
  customDomain?: string | null;
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${selected ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white/90 text-slate-500 hover:text-violet-600 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300"}`}
            title={selected ? "Seçimi kaldır" : "Toplu işlem için seç"}
          >
            {selected ? <CheckSquare size={16}/> : <Square size={16}/>}
          </button>
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
      
      {/* Middle: QR preview, title and link */}
      <div className="relative z-10 mt-2 flex flex-col items-center gap-4 text-center">
        <QRPreview qr={qr} onOpen={onPreview} />
        <div className="min-w-0 w-full">
          <h3
            title={qr.title}
            className="mb-1 min-h-[3.2rem] overflow-hidden text-lg font-bold leading-snug transition-colors text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-indigo-500"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            {qr.title}
          </h3>
          <a
            href={qrLink(qr.short_slug, customDomain)}
            target="_blank"
            rel="noreferrer"
            className="block text-xs font-mono truncate transition-colors text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300"
          >
            {qrLink(qr.short_slug, customDomain)}
          </a>
        </div>
        <div className="grid w-full grid-cols-5 gap-1.5">
          <button onClick={onCopy} className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" title="Linki kopyala">
            <Copy size={14} />
          </button>
          <a href={qrLink(qr.short_slug, customDomain)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" title="QR linkini aç">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => onDownload("png")} className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25" title="PNG indir">
            <FileImage size={14} />
          </button>
          <button onClick={() => onDownload("svg")} className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25" title="SVG indir">
            <Download size={14} />
          </button>
          <button onClick={onPdf} className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25" title="PDF indir">
            <FileText size={14} />
          </button>
        </div>
        <button onClick={onAnalytics} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-50 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25">
          <BarChart2 size={14} /> Tarama Analitiği
        </button>
      </div>
      
      {/* Bottom: Stats & Type */}
      <div className="flex items-end justify-between mt-2 pt-4 border-t relative z-10 transition-colors duration-500 border-slate-200/50 dark:border-white/10 group-hover:border-violet-500/20">
        <div>
           <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {qrTypeLabel(qr)}
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
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [styles, setStyles] = useState<QrStyle[]>([]);
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid" as ViewModeType);
  const [filterActive, setFilterActive] = useState("all" as FilterActiveType);
  const [folderFilter, setFolderFilter] = useState("all");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<QrCodeType | null>(null);
  const [dbError, setDbError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBento, setSelectedBento] = useState(null as BentoType);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickLookQr, setQuickLookQr] = useState<QrCodeType | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [planInfo, setPlanInfo] = useState<null | {
    plan: string; plan_label: string; status: string; status_label: string;
    expires_at: string | null; days_left: number | null; grace_days_left: number | null;
    limits: { max_qr: number };
    usage: { qr_count: number; qr_limit: number; qr_pct: number };
    can_create_qr: boolean; at_qr_limit: boolean;
  }>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingSyncNotice, setBillingSyncNotice] = useState<null | {
    tone: "info" | "success";
    title: string;
    body: string;
  }>(null);
  const [paymentState, setPaymentState] = useState<string | null>(null);
  const folderStripRef = useRef<HTMLDivElement | null>(null);

  const scrollFolderStrip = useCallback((direction: "left" | "right") => {
    const node = folderStripRef.current;
    if (!node) return;
    const distance = Math.max(260, Math.floor(node.clientWidth * 0.72));
    node.scrollBy({ left: direction === "left" ? -distance : distance, behavior: "smooth" });
  }, []);

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

  useEffect(() => {
    if (!isMounted) return;
    setPaymentState(new URLSearchParams(window.location.search).get("payment"));
  }, [isMounted]);

  const refreshStyles = useCallback(async () => {
    const styleRows = await fetchStyles().catch(() => []);
    setStyles(styleRows);
    return styleRows;
  }, []);

  const refreshPendingOrders = useCallback(async () => {
    const count = await fetchPendingMenuOrderCount().catch(() => 0);
    setPendingOrderCount(count);
    return count;
  }, []);

  // Load data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [codes, s, folderRows, styleRows, settingsRow, orderCount, planRes] = await Promise.all([
        fetchQrCodes(),
        fetchDashboardStats(),
        fetchFolders(),
        refreshStyles(),
        getOrCreateSettings().catch(() => null),
        fetchPendingMenuOrderCount().catch(() => 0),
        fetch("/api/v1/plan", { credentials: "same-origin" }).then(r => r.json()).catch(() => null),
      ]);
      const expiredTrash = codes.filter(trashExpired);
      if (expiredTrash.length > 0) {
        await Promise.all(expiredTrash.map(qr => deleteQrCode(qr.id).catch(() => undefined)));
      }
      setQrs(codes.filter(qr => !trashExpired(qr)));
      setStats(s);
      setFolders(folderRows);
      setStyles(styleRows);
      setCustomDomain(settingsRow?.custom_domain ?? null);
      setUserSettings(settingsRow);
      setPendingOrderCount(orderCount);
      if (planRes && !planRes.error) setPlanInfo(planRes);
      setDbError("");
    } catch (e) {
      setDbError((e as Error).message);
      toast.error("Veri yüklenemedi", "Hata");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [refreshStyles, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isMounted || status !== "authenticated" || paymentState !== "success") return;

    const timers: number[] = [];
    let stopped = false;
    const clearTimers = () => timers.forEach((timer) => window.clearTimeout(timer));
    const finishFlow = () => {
      setPaymentState(null);
      router.replace(pathname, { scroll: false });
    };

    setBillingSyncNotice({
      tone: "info",
      title: "Ödemeniz alındı",
      body: "Aboneliğiniz birkaç saniye içinde etkinleşiyor. Dashboard durumu otomatik yenileniyor.",
    });

    const refreshBillingState = async () => {
      const [nextPlan, nextSettings] = await Promise.all([
        fetch("/api/v1/plan", { credentials: "same-origin", cache: "no-store" })
          .then((response) => response.json())
          .catch(() => null),
        getOrCreateSettings().catch(() => null),
      ]);

      if (stopped) return false;
      if (nextSettings) setUserSettings(nextSettings);
      if (nextPlan && !nextPlan.error) {
        setPlanInfo(nextPlan);
        if ((nextPlan.status === "active" || nextPlan.status === "trial") && nextPlan.plan !== "free") {
          setBillingSyncNotice({
            tone: "success",
            title: "Aboneliğiniz etkin",
            body: `${nextPlan.plan_label} paketiniz başarıyla açıldı.`,
          });
          toast.success(`${nextPlan.plan_label} paketiniz başarıyla açıldı.`, "Abonelik etkin");
          finishFlow();
          return true;
        }
      }
      return false;
    };

    const schedule = [0, 2000, 4000, 6000, 10000];
    schedule.forEach((delay, index) => {
      const timer = window.setTimeout(() => {
        void refreshBillingState().then((activated) => {
          if (activated) {
            clearTimers();
            return;
          }
          if (!activated && index === schedule.length - 1 && !stopped) {
            setBillingSyncNotice({
              tone: "info",
              title: "Webhook bekleniyor",
              body: "Ödemeniz alındı. Aboneliğiniz birkaç saniye içinde görünmezse sayfayı yenileyebilirsiniz.",
            });
            finishFlow();
          }
        });
      }, delay);
      timers.push(timer);
    });

    return () => {
      stopped = true;
      clearTimers();
    };
  }, [isMounted, pathname, paymentState, router, status, toast]);

  useEffect(() => {
    if (!isMounted || status !== "authenticated") return;
    const interval = window.setInterval(() => {
      void refreshPendingOrders();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [isMounted, refreshPendingOrders, status]);

  const handleOpenPortal = useCallback(async () => {
    if (portalLoading) return;
    try {
      setPortalLoading(true);
      const response = await fetch("/api/billing/portal", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body?.url !== "string") {
        throw new Error(typeof body?.error === "string" ? body.error : "Portal bağlantısı hazırlanamadı.");
      }
      window.location.assign(body.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Portal bağlantısı hazırlanamadı.",
        "Abonelik yönetimi",
      );
    } finally {
      setPortalLoading(false);
    }
  }, [portalLoading, toast]);

  // Handlers
  const filtered = useMemo(() => qrs
    .filter(q => {
      const trashed = isTrashed(q);
      if (folderFilter === "trash") return trashed;
      if (trashed) return false;
      const needle = search.toLocaleLowerCase("tr-TR");
      const haystack = [
        q.title,
        q.short_slug,
        q.target_url,
        q.qr_type,
        qrTypeLabel(q),
        q.notes,
        ...(q.tags ?? []),
        q.folder_id ? folders.find(folder => folder.id === q.folder_id)?.name : "Klasörsüz",
        (q.dynamic_content as any)?.locationLabel,
        (q.dynamic_content as any)?.formTitle,
      ].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
      const matchSearch = !search || haystack.includes(needle);
      const matchFilter = filterActive === "all" || (filterActive === "active" ? q.is_active : !q.is_active);
      const matchFolder = folderFilter === "all" || (folderFilter === "uncategorized" ? !q.folder_id : q.folder_id === folderFilter);
      return matchSearch && matchFilter && matchFolder;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [qrs, search, filterActive, folderFilter, folders]
  );

  const folderNameById = useMemo(() => new Map(folders.map(folder => [folder.id, folder.name])), [folders]);
  const activeQrs = useMemo(() => qrs.filter(qr => !isTrashed(qr)), [qrs]);
  const trashQrs = useMemo(() => qrs.filter(isTrashed), [qrs]);
  const selectedQrs = useMemo(() => qrs.filter(qr => selectedIds.includes(qr.id)), [qrs, selectedIds]);
  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    activeQrs.forEach(qr => map.set(qr.folder_id ?? "uncategorized", (map.get(qr.folder_id ?? "uncategorized") ?? 0) + 1));
    return map;
  }, [activeQrs]);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      setFolderSaving(true);
      const folder = await createFolder(name);
      setFolders(prev => [folder, ...prev]);
      setFolderFilter(folder.id);
      setNewFolderName("");
      setFolderModalOpen(false);
      toast.success("Klasör oluşturuldu", "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör oluşturulamadı", "Hata");
    } finally {
      setFolderSaving(false);
    }
  };

  const handleDeleteFolder = async (folder: QrFolder) => {
    const affected = activeQrs.filter(qr => qr.folder_id === folder.id).length;
    const message = affected > 0
      ? `"${folder.name}" klasörü silinsin mi? İçindeki ${affected} QR klasörsüze taşınacak.`
      : `"${folder.name}" klasörü silinsin mi?`;
    if (!confirm(message)) return;
    try {
      const affectedQrs = qrs.filter(qr => qr.folder_id === folder.id);
      await Promise.all(affectedQrs.map(qr => updateQrCode(qr.id, { folder_id: null })));
      await deleteFolder(folder.id);
      setQrs(prev => prev.map(qr => qr.folder_id === folder.id ? { ...qr, folder_id: null } : qr));
      setFolders(prev => prev.filter(item => item.id !== folder.id));
      setFolderFilter(prev => prev === folder.id ? "all" : prev);
      toast.success("Klasör silindi", affected > 0 ? "QR'lar klasörsüze taşındı" : "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör silinemedi", "Hata");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu QR kodu çöp kutusuna taşınsın mı?")) return;
    try {
      const qr = qrs.find(item => item.id === id);
      if (!qr) return;
      const tags = trashTags(qr);
      await updateQrCode(id, { tags, is_active: false });
      setQrs(p => p.map(item => item.id === id ? { ...item, tags, is_active: false } : item));
      setSelectedIds(prev => prev.filter(item => item !== id));
      toast.success("QR çöp kutusuna taşındı", "Başarılı");
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

  const handleCopyLink = async (qr: QrCodeType) => {
    await copyToClipboard(qrLink(qr.short_slug, customDomain));
    toast.success("QR linki kopyalandı", "Hazır");
  };

  const handleDownload = async (qr: QrCodeType, format: "png" | "svg") => {
    try {
      await downloadQr(qr, format);
      toast.success(`${format.toUpperCase()} indirildi`, "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "İndirme başarısız", "Hata");
    }
  };

  const handlePdf = async (qr: QrCodeType) => {
    try {
      await downloadQrPdf(qr);
      toast.success("PDF indirildi", "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF oluşturulamadı", "Hata");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Bu QR kalıcı olarak silinsin mi?")) return;
    try {
      await deleteQrCode(id);
      setQrs(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(item => item !== id));
      toast.success("QR kalıcı olarak silindi", "Çöp kutusu");
    } catch {
      toast.error("Kalıcı silme başarısız", "Hata");
    }
  };

  const bulkDownload = async (format: "png" | "svg") => {
    for (const qr of selectedQrs) {
      await downloadQr(qr, format);
    }
    toast.success(`${selectedQrs.length} QR ${format.toUpperCase()} indiriliyor`, "Toplu işlem");
  };

  const bulkPdf = async () => {
    try {
      await downloadBulkQrPdf(selectedQrs);
      toast.success(`${selectedQrs.length} QR için PDF indirildi`, "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF oluşturulamadı", "Hata");
    }
  };

  const bulkApplyStyle = async (styleId: string) => {
    try {
      const nextStyleId = styleId === "__none" ? null : styleId;
      const latestStyles = await refreshStyles();
      if (nextStyleId && !latestStyles.some(style => style.id === nextStyleId)) {
        throw new Error("Seçilen şablon bulunamadı. Şablon listesini yenileyip tekrar deneyin.");
      }
      const appliedAt = new Date().toISOString();
      await Promise.all(selectedQrs.map(qr => updateQrCode(qr.id, { style_id: nextStyleId })));
      setQrs(prev => prev.map(qr => selectedIds.includes(qr.id) ? { ...qr, style_id: nextStyleId, updated_at: appliedAt } : qr));
      toast.success("Şablon seçili QR'lara uygulandı", "Toplu işlem");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Şablon uygulanamadı", "Hata");
    }
  };

  const bulkMoveFolder = async (folderId: string) => {
    try {
      const nextFolderId = folderId === "__none" ? null : folderId;
      await Promise.all(selectedQrs.map(qr => updateQrCode(qr.id, { folder_id: nextFolderId })));
      setQrs(prev => prev.map(qr => selectedIds.includes(qr.id) ? { ...qr, folder_id: nextFolderId } : qr));
      toast.success("Seçili QR'lar klasöre taşındı", "Toplu işlem");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör değiştirilemedi", "Hata");
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`${selectedIds.length} QR çöp kutusuna taşınsın mı?`)) return;
    try {
      const updates = selectedQrs.map(qr => ({ id: qr.id, tags: trashTags(qr) }));
      await Promise.all(updates.map(item => updateQrCode(item.id, { tags: item.tags, is_active: false })));
      setQrs(prev => prev.map(qr => {
        const update = updates.find(item => item.id === qr.id);
        return update ? { ...qr, tags: update.tags, is_active: false } : qr;
      }));
      clearSelection();
      toast.success("Seçili QR'lar çöp kutusuna taşındı", "Toplu işlem");
    } catch {
      toast.error("Toplu silme başarısız", "Hata");
    }
  };

  const bulkRestore = async () => {
    try {
      const updates = selectedQrs.map(qr => ({ id: qr.id, tags: restoreTags(qr) }));
      await Promise.all(updates.map(item => updateQrCode(item.id, { tags: item.tags })));
      setQrs(prev => prev.map(qr => {
        const update = updates.find(item => item.id === qr.id);
        return update ? { ...qr, tags: update.tags } : qr;
      }));
      clearSelection();
      toast.success("Seçili QR'lar geri alındı", "Çöp kutusu");
    } catch {
      toast.error("Geri alma başarısız", "Hata");
    }
  };

  const bulkPermanentDelete = async () => {
    if (!confirm(`${selectedIds.length} QR kalıcı olarak silinsin mi?`)) return;
    try {
      await Promise.all(selectedQrs.map(qr => deleteQrCode(qr.id)));
      setQrs(prev => prev.filter(qr => !selectedIds.includes(qr.id)));
      clearSelection();
      toast.success("Seçili QR'lar kalıcı olarak silindi", "Çöp kutusu");
    } catch {
      toast.error("Kalıcı silme başarısız", "Hata");
    }
  };

  const navItems = [
    { name: "Genel Bakış", icon: LayoutGrid, path: "/dashboard" },
    { name: "Kampanyalar", icon: FolderKanban, path: "/dashboard/campaigns" },
    { name: "Klasörler", icon: FolderKanban, path: "/dashboard/folders" },
    { name: "Siparişler", icon: ShoppingBag, path: "/dashboard/orders", badge: pendingOrderCount },
    { name: "Rezervasyonlar", icon: CalendarCheck, path: "/dashboard/bookings" },
    { name: "Geri Bildirimler", icon: ClipboardList, path: "/dashboard/feedback" },
    { name: "Raporlar", icon: BarChart2, path: "/dashboard/reports" },
    { name: "Şablonlar", icon: Wand2, path: "/dashboard/templates" },
    { name: "Organizasyonlar", icon: Building2, path: "/dashboard/organizations" },
    { name: "Ayarlar", icon: Settings, path: "/dashboard/settings" },
  ];

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "owner";

  if (!isMounted || status === "loading" || (loading && !hasLoaded)) {
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
      <aside className="relative z-40 hidden h-screen w-20 flex-shrink-0 flex-col border-r border-slate-200/50 bg-white/40 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-black/20 md:flex lg:w-72">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Link href="/" className="flex items-center gap-4 group outline-none mb-10">
            <BrandLogo className="w-[150px] lg:w-[188px]" width={420} height={134} />
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              const badge = "badge" in item ? item.badge ?? 0 : 0;
              return (
                <Link key={item.path} href={item.path} className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${isActive ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)]" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}>
                  <Icon size={20} className={isActive ? "text-white" : ""} />
                  <span className="hidden lg:block">{item.name}</span>
                  {badge > 0 && (
                    <span className="ml-auto inline-flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-white dark:ring-slate-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

        </div>

        <div className="shrink-0 space-y-4 border-t border-slate-200/60 p-4 dark:border-white/10 lg:p-6">
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
            <BrandLogo className="w-[132px]" width={420} height={134} />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-violet-200 bg-white/70 px-3 py-2 text-xs font-black text-violet-700 shadow-sm backdrop-blur-xl dark:border-violet-500/20 dark:bg-white/[0.05] dark:text-violet-200 sm:flex">
              <Crown size={14} />
              {planLabel(userSettings?.current_plan)}
            </div>
            <Link
              href="/pricing"
              className="hidden items-center gap-2 rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-sm font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-white/[0.05] dark:text-violet-200 dark:hover:bg-white/[0.08] lg:inline-flex"
            >
              <Crown size={15} />
              Paketini Yükselt
            </Link>
            <button onClick={() => planInfo?.at_qr_limit ? router.push("/pricing") : router.push("/dashboard/qrcodes/new")}
              title={planInfo?.at_qr_limit ? "QR limiti doldu — planı yükselt" : undefined}
              className={`hidden md:flex group relative items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-300 overflow-hidden active:scale-95 ${planInfo?.at_qr_limit ? "opacity-70 cursor-not-allowed shadow-none" : "shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_30px_-6px_rgba(124,58,237,0.7)] hover:-translate-y-0.5"}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 bg-[length:200%_auto] animate-shimmer" />
              <Plus size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">{planInfo?.at_qr_limit ? "Limit Doldu" : "Yeni Kampanya"}</span>
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

        <nav className="md:hidden px-4 pb-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2 text-xs font-black text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/25 dark:text-slate-300">
            <span>Menü</span>
            <span className="text-[10px] font-bold text-slate-400">Alt bardan geçiş yap</span>
          </div>
        </nav>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-12">
            {dbError && (
              <div className="flex items-start gap-3 p-4 rounded-[1.5rem] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-sm animate-fade-in">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Bağlantı Sorunu</p>
                  <p className="text-xs mt-1 opacity-80">{dbError}</p>
                </div>
              </div>
            )}

            {billingSyncNotice && (
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border px-5 py-4 ${
                  billingSyncNotice.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                    : "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  {billingSyncNotice.tone === "success" ? (
                    <CheckSquare size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <RefreshCw size={18} className="mt-0.5 shrink-0 animate-spin" />
                  )}
                  <div>
                    <p className="font-black">{billingSyncNotice.title}</p>
                    <p className="text-sm opacity-90">{billingSyncNotice.body}</p>
                  </div>
                </div>
                {billingSyncNotice.tone === "success" && (
                  <button
                    type="button"
                    onClick={() => setBillingSyncNotice(null)}
                    className="rounded-xl bg-white/70 px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    Tamam
                  </button>
                )}
              </div>
            )}

            {lastCreated && (
              <section className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-white/80 p-5 shadow-xl shadow-violet-200/30 backdrop-blur-xl dark:border-violet-500/25 dark:bg-white/[0.04] dark:shadow-none">
                <button
                  onClick={() => setLastCreated(null)}
                  className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Sonuç panelini kapat"
                >
                  <X size={16} />
                </button>
                <div className="flex flex-col gap-5 pr-8 md:flex-row md:items-center">
                  <QRPreview qr={lastCreated} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Son oluşturulan QR</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{lastCreated.title}</h2>
                    <a
                      href={qrLink(lastCreated.short_slug, customDomain)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate font-mono text-sm text-slate-500 transition-colors hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300"
                    >
                      {qrLink(lastCreated.short_slug, customDomain)}
                    </a>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => handleCopyLink(lastCreated)} variant="secondary" className="text-slate-800 dark:text-white">
                        <Copy size={14} /> Linki Kopyala
                      </Button>
                      <Button onClick={() => handleDownload(lastCreated, "png")}>
                        <FileImage size={14} /> PNG
                      </Button>
                      <Button onClick={() => handleDownload(lastCreated, "svg")}>
                        <Download size={14} /> SVG
                      </Button>
                      <Button onClick={() => handlePdf(lastCreated)} variant="danger">
                        <FileText size={14} /> PDF
                      </Button>
                      <a href={qrLink(lastCreated.short_slug, customDomain)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15">
                        <ExternalLink size={14} /> Aç
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Plan status banner ── */}
            {planInfo && (planInfo.status === "expired" || planInfo.status === "cancelled") && (
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
                planInfo.status === "expired"
                  ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                  : "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
              }`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className={planInfo.status === "expired" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"} />
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">
                      {planInfo.status === "expired"
                        ? `Plan süreniz doldu${planInfo.grace_days_left && planInfo.grace_days_left > 0 ? ` — ${planInfo.grace_days_left} gün içinde yenilemelisiniz` : " — yeni QR oluşturulamıyor"}`
                        : "Aboneliğiniz iptal edildi — yeni QR oluşturulamıyor"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mevcut QR kodlariniz ve scan redirect&apos;ler calismaya devam ediyor.</p>
                  </div>
                </div>
                <Link href="/pricing" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-violet-500 transition-colors">
                  Planı Yenile
                </Link>
              </div>
            )}

            {/* ── Plan info + QR limit ── */}
            <section className="flex flex-col gap-3 rounded-[1.5rem] border border-violet-200 bg-white/75 p-4 shadow-lg shadow-violet-200/25 backdrop-blur-xl dark:border-violet-500/20 dark:bg-white/[0.03] dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
                  <Crown size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mevcut Paket</p>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">{planLabel(userSettings?.current_plan)}</h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {planInfo && planInfo.limits.max_qr !== -1 && (
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>QR Kodları</span>
                      <span className={planInfo.at_qr_limit ? "text-red-600 dark:text-red-400" : ""}>{planInfo.usage.qr_count} / {planInfo.usage.qr_limit}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${planInfo.at_qr_limit ? "bg-red-500" : planInfo.usage.qr_pct >= 80 ? "bg-amber-500" : "bg-violet-500"}`}
                        style={{ width: `${Math.min(planInfo.usage.qr_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-white/10 dark:text-slate-300">{billingLabel(userSettings?.billing_cycle)}</span>
                  <span className={`rounded-xl px-3 py-2 ${
                    planInfo?.status === "active" || planInfo?.status === "free" || planInfo?.status === "trial"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : planInfo?.status === "expired" || planInfo?.status === "past_due"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  }`}>{statusLabel(userSettings?.subscription_status)}</span>
                  {userSettings?.plan_expires_at && <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Bitiş: {formatDateTime(userSettings.plan_expires_at)}</span>}
                  {typeof planInfo?.days_left === "number" && userSettings?.current_plan !== "free" && (
                    <span className="rounded-xl bg-violet-50 px-3 py-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      Kalan süre: {planInfo.days_left} gün
                    </span>
                  )}
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-500"
                >
                  Paketini Yükselt
                </Link>
                {userSettings?.current_plan && userSettings.current_plan !== "free" && (
                  <button
                    type="button"
                    onClick={() => void handleOpenPortal()}
                    disabled={portalLoading}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                  >
                    {portalLoading ? "Hazırlanıyor..." : "Aboneliği Yönet"}
                  </button>
                )}
              </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div onClick={() => setSelectedBento("scans")} className="col-span-2 md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-4 sm:p-10 border border-white/10 shadow-[0_14px_34px_-16px_rgba(124,58,237,0.55)] md:shadow-[0_20px_50px_-10px_rgba(124,58,237,0.4)] group cursor-pointer hover:shadow-[0_20px_60px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 transition-all duration-300">
                 <div className="absolute inset-0 z-0 hidden opacity-30 mix-blend-screen pointer-events-none sm:block">
                   <div className="absolute left-12 top-8 h-24 w-24 rounded-[2rem] border border-white/20 rotate-12" />
                   <div className="absolute bottom-8 right-24 h-20 w-20 rounded-full border border-white/20" />
                   <div className="absolute right-12 top-10 h-24 w-44 rounded-full bg-white/10 blur-2xl" />
                   <div className="absolute bottom-10 left-1/3 h-16 w-16 rounded-2xl border border-white/15 -rotate-12" />
                 </div>
                 <div className="absolute top-0 right-0 p-4 md:p-8 opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
                    <Activity className="h-20 w-20 md:h-40 md:w-40" strokeWidth={1} />
                 </div>
                 <div className="relative z-10 h-full flex flex-col justify-between min-h-[112px] md:min-h-[180px]">
                    <div>
                       <p className="text-violet-200 font-bold tracking-[0.16em] md:tracking-[0.2em] text-[10px] md:text-xs uppercase mb-2 md:mb-3">Toplam Etkileşim</p>
                       <h3 className="text-4xl md:text-7xl font-black tracking-tight">{stats.total_scans.toLocaleString("tr-TR")}</h3>
                    </div>
                    <div className="mt-4 md:mt-8 inline-flex items-center gap-2 md:gap-3 bg-white/10 w-max px-3 md:px-4 py-2 md:py-2.5 rounded-2xl backdrop-blur-md border border-white/20">
                       <TrendingUp size={14} className="text-emerald-300 md:h-[18px] md:w-[18px]" strokeWidth={3} />
                       <span className="text-xs md:text-sm font-bold text-emerald-100">Canlı veri</span>
                    </div>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("active")} className="rounded-3xl md:rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-4 md:p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[132px] md:min-h-[220px] cursor-pointer hover:border-violet-500/30">
                 <div className="w-11 h-11 md:w-16 md:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                    <CheckSquare className="h-5 w-5 md:h-7 md:w-7" strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.14em] md:tracking-[0.2em] text-[10px] md:text-xs uppercase mb-1 md:mb-2">Aktif Kodlar</p>
                    <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">{stats.active_qr}</h3>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("total")} className="rounded-3xl md:rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-4 md:p-8 flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/30 dark:shadow-none min-h-[132px] md:min-h-[220px] cursor-pointer hover:border-blue-500/30">
                 <div className="w-11 h-11 md:w-16 md:h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-inner">
                    <LayoutGrid className="h-5 w-5 md:h-7 md:w-7" strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.14em] md:tracking-[0.2em] text-[10px] md:text-xs uppercase mb-1 md:mb-2">Tüm Kodlar</p>
                    <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">{stats.total_qr}</h3>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("ai")} className="col-span-2 md:col-span-3 lg:col-span-2 rounded-3xl md:rounded-[2.5rem] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200/60 dark:border-amber-500/20 backdrop-blur-2xl p-4 sm:p-10 flex items-start sm:items-center gap-3 md:gap-6 group hover:shadow-lg transition-all duration-500 cursor-pointer hover:-translate-y-1 hover:border-amber-500/40">
                 <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-500/20 dark:to-orange-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="h-5 w-5 md:h-8 md:w-8 text-amber-700 dark:text-amber-400" />
                 </div>
                 <div>
                    <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest mb-3">AI Engine</div>
                    <h4 className="text-base md:text-xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">Sistem Önerisi</h4>
                    <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                      {stats.total_qr > 10 ? "Kodlarınızı kategorilere ayırmak için klasör sistemini kullanın. Böylece etkileşimleri daha kolay analiz edebilirsiniz." : "İlk kodunuzu oluşturdunuz! Şimdi hedef kitlenizin tarama yapması için kodu sosyal medyada paylaşın."}
                    </p>
                 </div>
              </div>

              <div onClick={() => setSelectedBento("today")} className="col-span-2 md:col-span-3 lg:col-span-2 rounded-3xl md:rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-2xl p-4 sm:p-10 flex items-center justify-between group shadow-xl shadow-slate-200/30 dark:shadow-none hover:-translate-y-1 transition-all duration-500 cursor-pointer hover:border-rose-500/30">
                 <div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-[0.14em] md:tracking-[0.2em] text-[10px] md:text-xs uppercase mb-1 md:mb-3">Bugünkü Taramalar</p>
                    <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white">{stats.scans_today}</h3>
                 </div>
                 <div className="w-14 h-14 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-12 shadow-inner">
                    <Zap className="h-6 w-6 md:h-10 md:w-10" strokeWidth={2} />
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
                  <div className="flex items-center p-1 rounded-lg border bg-white dark:bg-[#111] border-gray-200 dark:border-[#333]">
                    {(["grid", "list"] as const).map(mode => (
                      <button key={mode} onClick={() => setViewMode(mode)} className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${viewMode === mode ? "bg-gray-100 text-gray-900 dark:bg-[#333] dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`} title={mode === "grid" ? "Kart görünümü" : "Liste görünümü"}>
                        {mode === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                      </button>
                    ))}
                  </div>
                  <button onClick={load} className="p-2 rounded-lg border transition-colors bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={16} className="text-violet-500" />
                    <p className="text-sm font-black text-slate-900 dark:text-white">Klasörler</p>
                  </div>
                  <button onClick={() => setFolderModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-violet-400 hover:text-violet-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                    <Plus size={14} /> Klasör Ekle
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => scrollFolderStrip("left")}
                    className="absolute left-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-300 dark:shadow-black/20 dark:hover:bg-slate-900"
                    title="Sola kaydır"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 bg-gradient-to-r from-white/95 to-transparent dark:from-slate-950/80" />
                  <div ref={folderStripRef} className="flex min-w-0 snap-x gap-2 overflow-x-auto scroll-smooth px-11 pb-1 custom-scrollbar">
                    {[
                      { id: "all", name: "Tüm QR'lar", count: activeQrs.length },
                      { id: "uncategorized", name: "Klasörsüz", count: folderCounts.get("uncategorized") ?? 0 },
                      ...folders.map(folder => ({ id: folder.id, name: folder.name, count: folderCounts.get(folder.id) ?? 0 })),
                      { id: "trash", name: "Çöp Kutusu", count: trashQrs.length },
                    ].map(folder => (
                      <button key={folder.id} onClick={() => { setFolderFilter(folder.id); clearSelection(); }} className={`flex min-w-[170px] snap-start shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors sm:min-w-[190px] ${folderFilter === folder.id ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}>
                        <span className="truncate text-xs font-black">{folder.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${folderFilter === folder.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"}`}>{folder.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 bg-gradient-to-l from-white/95 to-transparent dark:from-slate-950/80" />
                  <button
                    type="button"
                    onClick={() => scrollFolderStrip("right")}
                    className="absolute right-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-300 dark:shadow-black/20 dark:hover:bg-slate-900"
                    title="Sağa kaydır"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </section>

              {selectedIds.length > 0 && (
                <section className="mt-4 rounded-[1.35rem] border border-violet-200 bg-white/95 p-3 shadow-xl shadow-violet-200/30 backdrop-blur-xl dark:border-violet-500/20 dark:bg-slate-950/95 dark:shadow-black/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white">{selectedIds.length} seçili</span>
                    {folderFilter === "trash" ? (
                      <>
                        <button onClick={bulkRestore} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200">Geri al</button>
                        <button onClick={bulkPermanentDelete} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-200">Kalıcı sil</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => bulkDownload("png")} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200">PNG indir</button>
                        <button onClick={() => bulkDownload("svg")} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200">SVG indir</button>
                        <button onClick={bulkPdf} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200">PDF</button>
                        <select onFocus={() => void refreshStyles()} onChange={(e) => e.target.value && bulkApplyStyle(e.target.value)} defaultValue="" className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                          <option value="">Şablon değiştir</option>
                          <option value="__none">Varsayılan</option>
                          {styles.map(style => <option key={style.id} value={style.id}>{style.name}</option>)}
                        </select>
                        <select onChange={(e) => e.target.value && bulkMoveFolder(e.target.value)} defaultValue="" className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                          <option value="">Klasöre taşı</option>
                          <option value="__none">Klasörsüz</option>
                          {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                        </select>
                        <button onClick={bulkDelete} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-200">Çöpe taşı</button>
                      </>
                    )}
                    <button onClick={clearSelection} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">Seçimi temizle</button>
                  </div>
                </section>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-24 px-6 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl animate-fade-in">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 shadow-inner">
                    <QrCode size={32} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Henüz QR Kodunuz Yok</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">{folderFilter === "trash" ? "Çöp kutusu boş. Sildiğiniz QR'lar 7 gün burada tutulur." : "İlk akıllı bağlantınızı oluşturun ve kitlenizle etkileşime geçmeye hemen başlayın."}</p>
                  {folderFilter !== "trash" && (
                    <button onClick={() => router.push("/dashboard/qrcodes/new")} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                      <Plus size={20} strokeWidth={3} /> İlk QR Kodu Oluştur
                    </button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                  {filtered.map((qr, i) => (
                    <QRCardPremium
                      key={qr.id}
                      qr={qr}
                      delay={i * 75}
                      onEdit={() => router.push(`/dashboard/qrcodes/${qr.id}/edit`)}
                      onDelete={() => folderFilter === "trash" ? handlePermanentDelete(qr.id) : handleDelete(qr.id)}
                      onToggle={() => handleToggle(qr)}
                      onAnalytics={() => router.push(`/dashboard/reports?qr=${qr.id}`)}
                      onCopy={() => handleCopyLink(qr)}
                      onDownload={(format) => handleDownload(qr, format)}
                      onPdf={() => handlePdf(qr)}
                      onPreview={() => setQuickLookQr(qr)}
                      selected={selectedIds.includes(qr.id)}
                      onSelect={() => toggleSelected(qr.id)}
                      customDomain={customDomain}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
                  <div className="hidden grid-cols-[128px_1.35fr_0.9fr_1.1fr_90px_250px] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 dark:border-white/10 md:grid">
                    <span>QR</span>
                    <span>Başlık</span>
                    <span>Klasör</span>
                    <span>Tarih</span>
                    <span>Tarama</span>
                    <span className="text-right">İşlem</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/10">
                    {filtered.map((qr) => (
                      <div key={qr.id} className="grid gap-4 px-4 py-4 md:grid-cols-[128px_1.35fr_0.9fr_1.1fr_90px_250px] md:items-center md:px-5">
                        <div className="flex items-center gap-3 md:block">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSelected(qr.id)}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${selectedIds.includes(qr.id) ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:text-violet-600 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300"}`}
                              title="Toplu işlem için seç"
                            >
                              {selectedIds.includes(qr.id) ? <CheckSquare size={15}/> : <Square size={15}/>}
                            </button>
                            <QRPreview qr={qr} size="sm" onOpen={() => setQuickLookQr(qr)} />
                          </div>
                          <div className="min-w-0 md:hidden">
                            <p
                              title={qr.title}
                              className="overflow-hidden font-black leading-snug text-slate-900 dark:text-white"
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                            >
                              {qr.title}
                            </p>
                            <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{qrLink(qr.short_slug, customDomain)}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-400">Oluşturma: {formatDateTime(qr.created_at)} · Güncelleme: {formatDateTime(qr.updated_at ?? qr.created_at)}</p>
                          </div>
                        </div>
                        <div className="hidden min-w-0 md:block">
                          <p
                            title={qr.title}
                            className="overflow-hidden font-black leading-snug text-slate-900 dark:text-white"
                            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                          >
                            {qr.title}
                          </p>
                          <a href={qrLink(qr.short_slug, customDomain)} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300">
                            {qrLink(qr.short_slug, customDomain)}
                          </a>
                        </div>
                        <div>
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {qr.folder_id ? folderNameById.get(qr.folder_id) ?? "Klasör" : "Klasörsüz"}
                          </span>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200">Oluşturma</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDateTime(qr.created_at)}</p>
                          <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-200">Güncelleme</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDateTime(qr.updated_at ?? qr.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 dark:text-white">{qr.scan_count.toLocaleString("tr-TR")}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarama</p>
                        </div>
                        <div className="flex flex-wrap justify-start gap-1.5 md:justify-end">
                          <button onClick={() => handleCopyLink(qr)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" title="Linki kopyala"><Copy size={14} /></button>
                          <a href={qrLink(qr.short_slug, customDomain)} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" title="Aç"><ExternalLink size={14} /></a>
                          <button onClick={() => handleDownload(qr, "png")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200" title="PNG"><FileImage size={14} /></button>
                          <button onClick={() => handleDownload(qr, "svg")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200" title="SVG"><Download size={14} /></button>
                          <button onClick={() => handlePdf(qr)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200" title="PDF"><FileText size={14} /></button>
                          <button onClick={() => router.push(`/dashboard/reports?qr=${qr.id}`)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200" title="Analitik"><BarChart2 size={14} /></button>
                          <button onClick={() => router.push(`/dashboard/qrcodes/${qr.id}/edit`)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" title="Düzenle"><Pencil size={14} /></button>
                          <button onClick={() => folderFilter === "trash" ? handlePermanentDelete(qr.id) : handleDelete(qr.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/15 dark:text-red-200" title={folderFilter === "trash" ? "Kalıcı sil" : "Çöpe taşı"}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => router.push("/dashboard/qrcodes/new")} className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-lg z-50 transition-transform active:scale-95 sm:hidden">
              <Plus size={24} />
            </button>
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#030712]/90 md:hidden">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              const badge = "badge" in item ? item.badge ?? 0 : 0;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative flex min-w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-black transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  }`}
                >
                  {badge > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-1 text-[9px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-white dark:ring-slate-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  <Icon size={16} />
                  <span className="max-w-full truncate">{item.name}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex min-w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                <ShieldAlert size={16} />
                Admin
              </Link>
            )}
          </div>
        </nav>
      </div>

      {quickLookQr && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={() => setQuickLookQr(null)} />
          <div className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl dark:bg-slate-950 dark:text-white">
            <button
              onClick={() => setQuickLookQr(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-950 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
              title="Kapat"
            >
              <X size={18}/>
            </button>
            <div className="pr-12">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">QR Quick Look</p>
              <h3 className="mt-1 truncate text-2xl font-black">{quickLookQr.title}</h3>
              <a href={qrLink(quickLookQr.short_slug, customDomain)} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300">
                {qrLink(quickLookQr.short_slug, customDomain)}
              </a>
            </div>
            <div className="my-6 flex justify-center">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-inner dark:border-white/10">
                <img src={qrRenderUrl(quickLookQr, "png", 1200)} alt={`${quickLookQr.title} QR kodu`} className="h-[min(62vw,380px)] w-[min(62vw,380px)] object-contain" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button onClick={() => handleCopyLink(quickLookQr)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><Copy size={14} className="mr-1 inline"/> Link</button>
              <a href={qrLink(quickLookQr.short_slug, customDomain)} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><ExternalLink size={14} className="mr-1 inline"/> Aç</a>
              <button onClick={() => handleDownload(quickLookQr, "png")} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200">PNG</button>
              <button onClick={() => handleDownload(quickLookQr, "svg")} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200">SVG</button>
              <button onClick={() => handlePdf(quickLookQr)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200">PDF</button>
            </div>
          </div>
        </div>
      )}

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
              <Button onClick={() => setSelectedBento(null)} size="lg">Anladım, Kapat</Button>
            </div>
          </div>
        </div>
      )}

      {folderModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFolderModalOpen(false)} aria-label="Kapat" />
          <form
            onSubmit={(e) => { e.preventDefault(); void handleCreateFolder(); }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">Yeni klasör</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Katalog, restoran menusu veya kampanya QR&apos;larini gruplayin.</p>
              </div>
              <button type="button" onClick={() => setFolderModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Klasör adı</label>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Örn: Katalog"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-violet-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setFolderModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">İptal</button>
              <button type="submit" disabled={folderSaving || !newFolderName.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                {folderSaving && <Loader2 size={15} className="animate-spin" />} Oluştur
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

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

// ─── QR Download helpers ──────────────────────────────────────────────────────
let _styleMapRef: Map<string, QrStyle> = new Map();

function normalizeCustomDomain(domain: string): string {
  const d = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return d;
}

function getPublicOrigin(settings: UserSettings | null): string {
  const d = settings?.custom_domain ? normalizeCustomDomain(settings.custom_domain) : "";
  if (d) return `https://${d}`;
  return window.location.origin;
}

function buildQrOptsFromStyle(style: QrStyle | undefined | null, dataUrl: string, size: number) {
  // eslint-disable-next-line
  let opts: any = {
    width: size, height: size, data: dataUrl, margin: 24,
    dotsOptions: { type: "rounded", color: "#0f172a" },
    cornersSquareOptions: { type: "extra-rounded", color: "#4f46e5" },
    cornersDotOptions: { type: "dot", color: "#4f46e5" },
    backgroundOptions: { color: "#ffffff" },
  };
  if (!style?.config) return opts;
  const c = style.config as Record<string, unknown>;
  const eyeColor = c.useCustomEyeColor ? c.eyeColor : (c.useGradient ? c.color1 : c.dotColor);
  opts = {
    width: size, height: size, data: dataUrl,
    margin: typeof c.margin === "number" ? c.margin : 24,
    qrOptions: { errorCorrectionLevel: c.ecLevel ?? "Q" },
    image: (c.savedLogoData as string | undefined) ?? undefined,
    imageOptions: { hideBackgroundDots: true, imageSize: typeof c.logoSize === "number" ? c.logoSize : 0.33, margin: 4 },
    dotsOptions: c.useGradient
      ? { type: c.dotType ?? "rounded", gradient: { type: c.gradientType ?? "linear", rotation: (((c.gradientAngle as number ?? 135) * Math.PI) / 180), colorStops: [{ offset: 0, color: (c.color1 as string) ?? "#6366f1" }, { offset: 1, color: (c.color2 as string) ?? "#ec4899" }] } }
      : { type: c.dotType ?? "rounded", color: c.dotColor ?? "#0f172a" },
    cornersSquareOptions: { type: c.eyeFrameType ?? "extra-rounded", color: (eyeColor as string) ?? "#0f172a" },
    cornersDotOptions: { type: c.eyeDotType ?? "dot", color: (eyeColor as string) ?? "#0f172a" },
    backgroundOptions: c.bgTransparent ? undefined : { color: c.bgColor ?? "#ffffff" },
  };
  return opts;
}

async function dlPng(qrData: QrCodeType, sm: Map<string, QrStyle>, origin: string) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const url = `${origin}/q/${qrData.short_slug}`;
  const style = qrData.style_id ? sm.get(qrData.style_id) : null;
  const qr = new QRCodeStyling(buildQrOptsFromStyle(style, url, 1024));
  await qr.download({ name: qrData.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(), extension: "png" });
}

async function dlSvg(qrData: QrCodeType, sm: Map<string, QrStyle>, origin: string) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const url = `${origin}/q/${qrData.short_slug}`;
  const style = qrData.style_id ? sm.get(qrData.style_id) : null;
  const qr = new QRCodeStyling(buildQrOptsFromStyle(style, url, 1024));
  await qr.download({ name: qrData.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(), extension: "svg" });
}

async function dlPdf(qrData: QrCodeType, sm: Map<string, QrStyle>, origin: string) {
  const url = `${origin}/q/${qrData.short_slug}`;
  const win = window.open("", "_blank");
  if (!win) return;

  const { default: QRCodeStyling } = await import("qr-code-styling");
  const style = qrData.style_id ? sm.get(qrData.style_id) : null;
  const qr = new QRCodeStyling(buildQrOptsFromStyle(style, url, 520));
  const blob = await qr.getRawData("png");
  const dataUrl = blob ? await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.readAsDataURL(blob as Blob);
  }) : "";

  const safeTitle = (qrData.title || "QR").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  win.document.write(`<!DOCTYPE html><html><head><title>${safeTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#fff;}
    h2{font-size:1.1rem;margin:0 0 1rem;color:#1e293b;font-weight:800;max-width:92vw;text-align:center}
    .url{font-size:.72rem;color:#64748b;margin-top:.75rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-width:92vw;text-align:center;word-break:break-all}
    .btn{margin-bottom:1.25rem;padding:.55rem 1.25rem;background:#4f46e5;color:#fff;border:none;border-radius:.75rem;cursor:pointer;font-size:.85rem;font-weight:700;}
    .card{display:flex;flex-direction:column;align-items:center;padding:22px 22px 18px;border:1px solid #e2e8f0;border-radius:18px}
    img{width:280px;height:280px;object-fit:contain}
    @media print{.btn{display:none}.card{border:none}}
  </style>
  </head><body>
  <button class="btn" onclick="window.print()">🖨 PDF Olarak Kaydet</button>
  <div class="card">
    <h2>${safeTitle}</h2>
    ${dataUrl ? `<img src="${dataUrl}" alt="QR"/>` : `<div style="width:280px;height:280px;display:flex;align-items:center;justify-content:center;color:#64748b">QR üretilemedi</div>`}
    <div class="url">${url}</div>
  </div>
  </body></html>`);
  win.document.close();
}

type BartenderRow = {
  SKU: string;
  "ÜRÜN ADI": string;
  "QR DOSYA ADI": string;
  ADT: number;
};

async function exportBartenderSheet(rows: BartenderRow[]) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();
  const ws = utils.json_to_sheet(rows, {
    header: ["SKU", "ÜRÜN ADI", "QR DOSYA ADI", "ADT"],
  });
  utils.book_append_sheet(wb, ws, "BARTENDER");
  writeFile(wb, `bartender-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── QR Thumbnail ─────────────────────────────────────────────────────────────
function QRThumb({ slug, style, origin }: { slug: string; style?: QrStyle | null; origin: string }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const dataUrl = `${origin}/q/${slug}`;
      const opts = buildQrOptsFromStyle(style, dataUrl, 56);
      opts.margin = 3;
      const q = new QRCodeStyling(opts);
      q.getRawData("png").then(blob => { if (blob) setThumb(URL.createObjectURL(blob as Blob)); }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, origin, style?.id, JSON.stringify(style?.config ?? {})]);
  if (!thumb) {
    return (
      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
        <QrCode size={16} className="text-slate-400 relative"/>
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
      <Image src={thumb} alt="QR" width={56} height={56} className="w-14 h-14 object-cover" unoptimized />
    </div>
  );
}

function ActionMenu({
  open, onClose, items, anchorRect, isDark,
}: {
  open: boolean;
  onClose: () => void;
  items: Array<{ icon: React.ReactNode; label: string; onClick?: () => void; href?: string; danger?: boolean }>;
  anchorRect: DOMRect | null;
  isDark: boolean;
}) {
  const pos = useMemo(() => {
    if (!anchorRect) return { top: 0, left: 0 };
    const width = 184; // ~w-44
    const margin = 8;
    const top = Math.min(anchorRect.bottom + 6, window.innerHeight - margin);
    const left = Math.min(Math.max(anchorRect.right - width, margin), window.innerWidth - width - margin);
    return { top, left };
  }, [anchorRect]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !anchorRect) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] animate-fadein" onMouseDown={onClose} />
      <div
        className={`fixed z-[9999] w-44 rounded-2xl border shadow-2xl overflow-hidden animate-scalein ${isDark ? "bg-[#0f1627]/95 border-white/10" : "bg-white/95 border-slate-200"} backdrop-blur-xl`}
        style={{ top: pos.top, left: pos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-1">
          {items.map((item, i) => item.href ? (
            <Link key={i} href={item.href} onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>
              {item.icon}{item.label}
            </Link>
          ) : (
            <button key={i} onClick={() => { item.onClick?.(); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${item.danger ? "text-red-400 hover:bg-red-500/10" : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Analytics Drawer ─────────────────────────────────────────────────────────
function AnalyticsDrawer({ qr, onClose, isDark, styleMap, origin }: {
  qr: QrCodeType; onClose: () => void; isDark: boolean; styleMap: Map<string, QrStyle>; origin: string;
}) {
  const [daily, setDaily] = useState<DailyStats[]>([]);
  const [devices, setDevices] = useState<DeviceStats[]>([]);
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [unique30, setUnique30] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDailyStats(qr.id, 30), fetchDeviceStats(qr.id), fetchRecentScans(qr.id, 20), fetchUniqueScanCount(qr.id, 30)])
      .then(([d, dv, s, u]) => { setDaily(d); setDevices(dv); setScans(s); setUnique30(u); })
      .finally(() => setLoading(false));
  }, [qr.id]);

  const total = Math.max(devices.reduce((s, d) => s + d.count, 0), 1);
  const max = Math.max(...daily.map(d => d.scans), 1);
  const last14 = daily.slice(-14);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadein" onClick={onClose}/>
      <div className={`relative z-10 w-full max-w-[380px] ${isDark ? "bg-[#0c0f1a]/95 border-white/[0.10]" : "bg-white/95 border-slate-200"} border-l h-full overflow-y-auto flex flex-col shadow-2xl animate-fadein backdrop-blur-2xl`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 px-5 py-4 border-b ${isDark ? "bg-[#0c0f1a] border-white/[0.08]" : "bg-white border-slate-100"} flex items-center justify-between`}>
          <div>
            <h3 className={`font-bold text-sm truncate max-w-[220px] ${isDark ? "text-white" : "text-slate-900"}`}>{qr.title}</h3>
            <p className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>/q/{qr.short_slug}</p>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"} transition-all`}><X size={14}/></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400"/></div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Toplam Tarama", v: qr.scan_count, color: "#7c3aed" },
                { l: "Son 30 Gün", v: daily.reduce((s, d) => s + d.scans, 0), color: "#10b981" },
                { l: "Tekil (30g)", v: unique30 ?? 0, color: "#f59e0b" },
              ].map(s => (
                <div key={s.l} className={`rounded-xl p-3 border ${isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-[10px] mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{s.l}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.v.toLocaleString("tr-TR")}</p>
                </div>
              ))}
            </div>
            <p className={`text-[11px] -mt-3 ${isDark ? "text-slate-600" : "text-slate-500"}`}>
              Tekil tarama: Aynı cihaz/IP’nin aynı gün içindeki tekrarları 1 sayılır.
            </p>

            {/* Chart */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Son 14 Gün</p>
              <div className="flex items-end gap-1 h-16">
                {last14.map((d, i) => (
                  <div key={d.date} className="flex-1 group/b relative" title={`${d.date}: ${d.scans}`}>
                    <div className="w-full rounded-t-sm transition-all" style={{
                      height: `${Math.max((d.scans / max) * 100, 4)}%`,
                      background: i === last14.length - 1 ? "linear-gradient(to top,#7c3aed,#a78bfa)" : isDark ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.15)",
                    }}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Devices */}
            {devices.length > 0 && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cihazlar</p>
                {devices.map(d => (
                  <div key={d.device} className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {d.device === "Mobile" ? <Smartphone size={11}/> : d.device === "Tablet" ? <Tablet size={11}/> : <Monitor size={11}/>}
                        {d.device}
                      </span>
                      <span className={`font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>{d.count} (%{Math.round(d.count/total*100)})</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDark ? "bg-white/[0.07]" : "bg-slate-200"}`}>
                      <div className="h-full rounded-full" style={{ width: `${d.count/total*100}%`, background: "linear-gradient(90deg,#7c3aed,#4f46e5)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Downloads */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>İndir</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => dlPng(qr, styleMap, origin)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5" : "border-slate-200 text-slate-600 hover:border-violet-400 hover:bg-violet-50"}`}>
                  <FileImage size={13}/> PNG
                </button>
                <button onClick={() => dlSvg(qr, styleMap, origin)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/5" : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                  <Download size={13}/> SVG
                </button>
                <button onClick={() => { void dlPdf(qr, styleMap, origin); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-rose-500/40 hover:text-rose-300 hover:bg-rose-500/5" : "border-slate-200 text-slate-600 hover:border-rose-400 hover:bg-rose-50"}`}>
                  <FilePdf size={13}/> PDF
                </button>
              </div>
            </div>

            {/* Recent scans */}
            {scans.length > 0 && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Son Taramalar</p>
                <div className={`rounded-xl border overflow-hidden ${isDark ? "border-white/[0.07]" : "border-slate-200"}`}>
                  {scans.slice(0, 8).map((s, i) => (
                    <div key={s.id} className={`flex justify-between py-2.5 px-3 text-xs ${i > 0 ? `border-t ${isDark ? "border-white/[0.04]" : "border-slate-100"}` : ""} ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <span>{s.device ?? "?"} · {s.os ?? "?"}</span>
                      <span className={isDark ? "text-slate-600" : "text-slate-400"}>{new Date(s.scanned_at).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR Row ───────────────────────────────────────────────────────────────────
function QRRow({ qr, selected, onSelect, onEdit, onDelete, onToggle, onStats, isDark, origin }: {
  qr: QrCodeType; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void; onStats: () => void; isDark: boolean;
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const copy = () => {
    copyToClipboard(`${origin}/q/${qr.short_slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const TYPE_COLORS: Record<string, string> = {
    url: "#6366f1", product: "#f97316", vcard: "#8b5cf6", wifi: "#06b6d4", sms: "#10b981",
    email: "#f59e0b", whatsapp: "#25D366", text: "#64748b", phone: "#ef4444",
  };
  const TYPE_LABELS: Record<string, string> = {
    url: "URL", product: "Ürün QR", vcard: "Kartvizit", wifi: "WiFi", sms: "SMS",
    email: "E-posta", whatsapp: "WhatsApp", text: "Metin", phone: "Telefon",
  };
  const typeColor = TYPE_COLORS[qr.qr_type ?? "url"] ?? "#6366f1";
  const date = new Date(qr.created_at);

  return (
    <div className={`group flex items-center gap-4 px-5 py-3.5 border-b transition-all
      ${isDark ? "border-white/[0.06]" : "border-slate-100"}
      ${selected ? isDark ? "bg-violet-950/22 border-l-2 border-l-violet-500/80" : "bg-violet-50/60 border-l-2 border-l-violet-400/80" : ""}
      ${!qr.is_active ? "opacity-50" : ""}
      ${isDark ? "hover:bg-white/[0.03] hover:shadow-[0_18px_60px_rgba(0,0,0,0.30)] hover:-translate-y-[1px]" : "hover:bg-white/70 hover:shadow-md hover:-translate-y-[1px]"}`
    }>

      {/* Checkbox */}
      <button onClick={onSelect} className={`shrink-0 transition-colors ${isDark ? "text-slate-700 hover:text-violet-400" : "text-slate-300 hover:text-violet-500"}`}>
        {selected ? <CheckSquare size={14} className="text-violet-500"/> : <Square size={14}/>}
      </button>

      {/* QR Thumb */}
      <div className="shrink-0 hidden sm:block">
        <QRThumb slug={qr.short_slug} style={qr.style_id ? _styleMapRef.get(qr.style_id) : null} origin={origin}/>
      </div>

      {/* Title + slug */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <button onClick={onEdit} className={`font-semibold text-sm truncate hover:text-violet-500 transition-colors text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            {qr.title}
          </button>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${qr.is_active ? "bg-emerald-400" : isDark ? "bg-slate-700" : "bg-slate-300"}`}/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`${origin}/q/${qr.short_slug}`}
            target="_blank" rel="noreferrer"
            className={`text-[11px] font-mono hover:text-violet-500 transition-colors flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            /q/{qr.short_slug} <ExternalLink size={9}/>
          </a>
          <button onClick={copy} className={`${isDark ? "text-slate-600 hover:text-violet-400" : "text-slate-300 hover:text-violet-500"} transition-colors`}>
            {copied ? <Check size={10} className="text-emerald-400"/> : <Copy size={10}/>}
          </button>
          {/* Badges */}
          {qr.pixel_id && qr.pixel_enabled !== false && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">Pixel</span>}
          {qr.utm_source && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-semibold">UTM</span>}
          {qr.password && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">🔒</span>}
          {qr.ab_test_url && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">A/B</span>}
        </div>
      </div>

      {/* Type badge */}
      <div className="hidden md:flex shrink-0">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${typeColor}15`, color: typeColor }}>
          {TYPE_LABELS[qr.qr_type ?? "url"] ?? qr.qr_type}
        </span>
      </div>

      {/* Scan count */}
      <div className="shrink-0 text-right hidden sm:block">
        <button onClick={onStats} className={`text-lg font-black leading-none hover:text-violet-500 transition-colors ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {qr.scan_count.toLocaleString("tr-TR")}
        </button>
        <p className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>tarama</p>
      </div>

      {/* Date */}
      <div className={`shrink-0 text-right hidden lg:block ${isDark ? "text-slate-600" : "text-slate-400"}`}>
        <p className="text-[11px]">{date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}</p>
        <p className="text-[10px]">{date.getFullYear()}</p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Text actions (like list UX) */}
        <div className="hidden xl:flex items-center gap-1.5 mr-1.5">
          <button
            onClick={copy}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              isDark
                ? "border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5"
                : "border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50"
            }`}
            title="Paylaş (kopyala)"
          >
            {copied ? "Kopyalandı" : "Paylaş"}
          </button>
          <button
            onClick={() => { void dlSvg(qr, _styleMapRef, origin); }}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              isDark
                ? "border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/5"
                : "border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
            }`}
            title="SVG indir"
          >
            SVG
          </button>
          <button
            onClick={() => { void dlPng(qr, _styleMapRef, origin); }}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              isDark
                ? "border-white/10 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-500/5"
                : "border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
            title="PNG indir"
          >
            PNG
          </button>
        </div>
        <button onClick={onStats} title="Analitik"
          className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}>
          <BarChart2 size={13}/>
        </button>
        <button onClick={onEdit} title="Düzenle"
          className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-violet-400 hover:bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"}`}>
          <Pencil size={13}/>
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setAnchorRect(r);
              setMenuOpen(p => !p);
            }}
            className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-slate-300 hover:bg-white/8" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
            <MoreHorizontal size={13}/>
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

  const [activeSection, setActiveSection] = useState<"qrlist"|"templates"|"bulk"|"analytics"|"settings">("qrlist");
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
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

  const authChecked = useRef(false);
  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        if (session.user.user_metadata?.must_change_password) { window.location.href = "/auth/force-change"; return; }
        setCurrentUserRole(session.user.user_metadata?.role ?? "user");
        setCurrentUserEmail(session.user.email ?? "");
      }).catch(() => { window.location.href = "/login"; });
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
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
    setShowCreate(false); setEditTarget(null);
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
  type NavItem = { icon: React.ReactNode; label: string; section: "analytics" | "templates" | "qrlist" | "bulk" | "settings" | null; href?: string };
  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "QR KODLARIM",
      items: [
        { icon: <List size={15}/>, label: "QR Listesi", section: "qrlist" },
        { icon: <BarChart2 size={15}/>, label: "Analitik", section: "analytics" },
        { icon: <Star size={15}/>, label: "Şablonlar", section: "templates" },
      ]
    },
    {
      label: "ARAÇLAR",
      items: [
        { icon: <FileSpreadsheet size={15}/>, label: "Toplu Yükleme", section: "bulk" },
        { icon: <Mail size={15}/>, label: "Mesajlar", section: null, href: "/dashboard/messages" },
      ]
    },
    {
      label: "AYARLAR",
      items: [
        { icon: <Settings size={15}/>, label: "Ayarlar", section: "settings" },
      ]
    },
  ];

  const statCards = [
    { label: "Toplam QR", value: stats.total_qr, icon: <QrCode size={16}/>, color: "#7c3aed" },
    { label: "Aktif", value: stats.active_qr, icon: <Activity size={16}/>, color: "#10b981" },
    { label: "Toplam Tarama", value: stats.total_scans, icon: <TrendingUp size={16}/>, color: "#f59e0b" },
    { label: "Bugün", value: stats.scans_today, icon: <Zap size={16}/>, color: "#ec4899" },
  ];

  return (
    <div className={`min-h-screen ${pg} flex flex-col`}>
      <OnboardingTour
        isDark={isDark}
        steps={[
          { key: "create", title: "İlk QR’ını oluştur", desc: "Buradan yeni bir QR oluşturabilir, şablon ve kurallar ekleyebilirsin.", selector: "[data-tour='create-qr']", placement: "right" },
          { key: "search", title: "Hızlı arama", desc: "Başlık veya slug ile saniyeler içinde QR bul.", selector: "[data-tour='search']", placement: "bottom" },
          { key: "analytics", title: "Analitik", desc: "Bir QR’ın tarama sayısına tıklayıp detaylı analitik panelini aç.", selector: "[data-tour='nav-analytics']", placement: "right" },
        ]}
      />

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b ${topbar} backdrop-blur-2xl`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 w-56 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <QrCode size={15} className="text-white"/>
          </div>
          <span className={`font-black text-base tracking-tight ${tx}`}>
            QR<span className="text-violet-500">Hub</span>
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
            <input
              placeholder="QR kodlarında ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-tour="search"
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all focus-premium ${inputCls}`}
            />
            <p className={`text-[10px] mt-1 ${sub}`}>
              İpucu: Başlık veya slug ile arayabilirsiniz.
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 w-56 justify-end">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/30" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          {(currentUserRole === "admin" || currentUserRole === "owner") && (
            <Link href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${isDark ? "border-violet-800/40 text-violet-400 hover:bg-violet-900/20" : "border-violet-200 text-violet-600 hover:bg-violet-50"}`}>
              <Shield size={12}/> Admin
            </Link>
          )}
          <ProfileMenu email={currentUserEmail} role={currentUserRole} isDark={isDark} onLogout={handleLogout} avatarUrl={settings?.avatar_url ?? null}/>
        </div>
      </header>

      <div className="flex pt-14 flex-1">

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside className={`fixed left-0 top-14 bottom-0 w-56 border-r ${sidebar} flex flex-col z-30 overflow-y-auto backdrop-blur-2xl`}>
          {/* Create button */}
          <div className="p-3">
            <button onClick={() => setShowCreate(true)}
              data-tour="create-qr"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all btn-premium focus-premium">
              <Plus size={15}/> QR Kod Oluştur
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 pb-4 space-y-5">
            {navGroups.map(group => (
              <div key={group.label}>
                <p className={`text-[9px] font-black tracking-widest px-2 mb-1.5 ${sub}`}>{group.label}</p>
                {group.items.map(item => {
                  const isActive = item.section ? activeSection === item.section : false;
                  if (item.href) {
                    return (
                      <a key={item.label} href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
                        {item.icon}<span>{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <button key={item.label} onClick={() => item.section && setActiveSection(item.section as "analytics" | "templates" | "qrlist" | "bulk")}
                      data-tour={item.section === "analytics" ? "nav-analytics" : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                        isActive
                          ? "bg-violet-600 text-white font-semibold shadow-sm"
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
          {activeSection === "qrlist" && (<>

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
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all btn-premium focus-premium">
                <Plus size={14}/> Yeni QR
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map(s => (
              <div key={s.label} className={`rounded-2xl border ${card} p-4 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18`, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>{s.label}</p>
                  <p className={`text-2xl font-black ${tx}`}>{s.value.toLocaleString("tr-TR")}</p>
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
                  <button onClick={() => setShowCreate(true)}
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
                    onEdit={() => setEditTarget(qr)} onDelete={() => handleDelete(qr.id)}
                    onToggle={() => handleToggle(qr)} onStats={() => setStatsTarget(qr)}/>
                ))}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(qr => (
                  <QRCard key={qr.id} qr={qr} selected={selected.has(qr.id)} isDark={isDark}
                    origin={publicOrigin}
                    onSelect={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}
                    onEdit={() => setEditTarget(qr)} onDelete={() => handleDelete(qr.id)}
                    onToggle={() => handleToggle(qr)} onStats={() => setStatsTarget(qr)}/>
                ))}
              </div>
            )}
          </div>
          </>)}
        </main>
      </div>

      {/* Modals */}
      {(showCreate || editTarget) && (
        <CreateQRModal editing={editTarget} theme={theme}
          onClose={() => { setShowCreate(false); setEditTarget(null); }} onSuccess={handleSuccess}/>
      )}
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

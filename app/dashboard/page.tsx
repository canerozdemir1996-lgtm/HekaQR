"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, QrCode, BarChart2, Copy, Pencil, Trash2, Power,
  X, ExternalLink, Smartphone, Monitor, Tablet, TrendingUp,
  Activity, Search, Loader2, RefreshCw,
  Wand2, FileSpreadsheet, Star, Download, CheckSquare,
  Square, FileImage, FileText as FilePdf, Sun, Moon, LayoutGrid, List,
  Tag, Lock, MoreHorizontal, Check,
  Globe, AlertTriangle, Infinity as InfinityIcon, LogOut, Shield,
  ChevronDown, Zap, Users, Settings, HelpCircle, Home,
} from "lucide-react";
import {
  fetchQrCodes, fetchDashboardStats, fetchDailyStats,
  fetchDeviceStats, fetchRecentScans, deleteQrCode, bulkDeleteQrCodes,
  toggleActive, fetchStyles, type QrCode as QrCodeType, type DailyStats,
  type DeviceStats, type ScanLog, type QrStyle,
  getSupabase,
} from "@/lib/supabase";
import CreateQRModal from "@/components/CreateQRModal";
import { useTheme } from "@/lib/theme";
import { copyToClipboard } from "@/lib/clipboard";
import { TemplatesSection } from "@/components/TemplatesSection";
import { BulkSection } from "@/components/BulkSection";

// ─── QR Download helpers ──────────────────────────────────────────────────────
let _styleMapRef: Map<string, QrStyle> = new Map();

async function dlPng(qrData: QrCodeType, sm: Map<string, QrStyle>) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const url = `${window.location.origin}/q/${qrData.short_slug}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let opts: any = {
    width: 1024, height: 1024, data: url, margin: 24,
    dotsOptions: { type: "rounded", color: "#0f172a" },
    cornersSquareOptions: { type: "extra-rounded", color: "#4f46e5" },
    cornersDotOptions: { type: "dot", color: "#4f46e5" },
    backgroundOptions: { color: "#ffffff" },
  };
  if (qrData.style_id) {
    const style = sm.get(qrData.style_id);
    if (style?.config) {
      const c = style.config as Record<string, unknown>;
      const eyeColor = c.useCustomEyeColor ? c.eyeColor : (c.useGradient ? c.color1 : c.dotColor);
      opts = {
        width: 1024, height: 1024, data: url,
        margin: typeof c.margin === "number" ? c.margin : 24,
        qrOptions: { errorCorrectionLevel: c.ecLevel ?? "Q" },
        dotsOptions: c.useGradient
          ? { type: c.dotType ?? "rounded", gradient: { type: c.gradientType ?? "linear", rotation: ((c.gradientAngle as number ?? 135) * Math.PI) / 180, colorStops: [{ offset: 0, color: c.color1 as string ?? "#6366f1" }, { offset: 1, color: c.color2 as string ?? "#ec4899" }] } }
          : { type: c.dotType ?? "rounded", color: c.dotColor ?? "#0f172a" },
        cornersSquareOptions: { type: c.eyeFrameType ?? "extra-rounded", color: eyeColor ?? "#0f172a" },
        cornersDotOptions: { type: c.eyeDotType ?? "dot", color: eyeColor ?? "#0f172a" },
        backgroundOptions: c.bgTransparent ? undefined : { color: c.bgColor ?? "#ffffff" },
      };
    }
  }
  const qr = new QRCodeStyling(opts);
  await qr.download({ name: qrData.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(), extension: "png" });
}

function dlPdf(slug: string, title: string) {
  const url = `${window.location.origin}/q/${slug}`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#fff;}
  h2{font-size:1.1rem;margin-bottom:1rem;color:#1e293b;font-weight:700;}
  .url{font-size:.7rem;color:#64748b;margin-top:.75rem;font-family:monospace;}
  .btn{margin-bottom:1.5rem;padding:.5rem 1.5rem;background:#4f46e5;color:#fff;border:none;border-radius:.5rem;cursor:pointer;font-size:.85rem;font-weight:600;}
  @media print{.btn{display:none}}</style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  </head><body>
  <button class="btn" onclick="window.print()">🖨 PDF Olarak Kaydet</button>
  <h2>${title}</h2>
  <div id="qr"></div>
  <p class="url">${url}</p>
  <script>new QRCode(document.getElementById('qr'),{text:'${url}',width:280,height:280,colorDark:'#0f172a',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.Q});<\/script>
  </body></html>`);
  win.document.close();
}

// ─── QR Thumbnail ─────────────────────────────────────────────────────────────
function QRThumb({ slug }: { slug: string }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const q = new QRCodeStyling({
        width: 56, height: 56,
        data: `${window.location.origin}/q/${slug}`,
        dotsOptions: { type: "rounded", color: "#0f172a" },
        cornersSquareOptions: { type: "extra-rounded", color: "#4f46e5" },
        backgroundOptions: { color: "#ffffff" },
        margin: 3,
      });
      q.getRawData("png").then(blob => { if (blob) setThumb(URL.createObjectURL(blob as Blob)); }).catch(() => {});
    });
  }, [slug]);
  if (!thumb) return <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center"><QrCode size={16} className="text-slate-400"/></div>;
  return <img src={thumb} alt="QR" className="w-14 h-14 rounded-xl border border-slate-200 shadow-sm object-cover"/>;
}

// ─── Analytics Drawer ─────────────────────────────────────────────────────────
function AnalyticsDrawer({ qr, onClose, isDark, styleMap }: {
  qr: QrCodeType; onClose: () => void; isDark: boolean; styleMap: Map<string, QrStyle>;
}) {
  const [daily, setDaily] = useState<DailyStats[]>([]);
  const [devices, setDevices] = useState<DeviceStats[]>([]);
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDailyStats(qr.id, 30), fetchDeviceStats(qr.id), fetchRecentScans(qr.id, 20)])
      .then(([d, dv, s]) => { setDaily(d); setDevices(dv); setScans(s); })
      .finally(() => setLoading(false));
  }, [qr.id]);

  const total = Math.max(devices.reduce((s, d) => s + d.count, 0), 1);
  const max = Math.max(...daily.map(d => d.scans), 1);
  const last14 = daily.slice(-14);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 w-full max-w-[380px] ${isDark ? "bg-[#0c0f1a] border-white/[0.08]" : "bg-white border-slate-200"} border-l h-full overflow-y-auto flex flex-col shadow-2xl`}>
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
              ].map(s => (
                <div key={s.l} className={`rounded-xl p-3 border ${isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-[10px] mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{s.l}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.v.toLocaleString("tr-TR")}</p>
                </div>
              ))}
            </div>

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
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => dlPng(qr, styleMap)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5" : "border-slate-200 text-slate-600 hover:border-violet-400 hover:bg-violet-50"}`}>
                  <FileImage size={13}/> PNG
                </button>
                <button onClick={() => dlPdf(qr.short_slug, qr.title)}
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

            {/* Studio link */}
            <Link href={`/dashboard/studio/${qr.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">
              <Wand2 size={13}/> Tasarım Stüdyosu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR Row ───────────────────────────────────────────────────────────────────
function QRRow({ qr, selected, onSelect, onEdit, onDelete, onToggle, onStats, isDark }: {
  qr: QrCodeType; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void; onStats: () => void; isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const copy = () => {
    copyToClipboard(`${window.location.origin}/q/${qr.short_slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const TYPE_COLORS: Record<string, string> = {
    url: "#6366f1", vcard: "#8b5cf6", wifi: "#06b6d4", sms: "#10b981",
    email: "#f59e0b", whatsapp: "#25D366", text: "#64748b", phone: "#ef4444",
  };
  const TYPE_LABELS: Record<string, string> = {
    url: "URL", vcard: "Kartvizit", wifi: "WiFi", sms: "SMS",
    email: "E-posta", whatsapp: "WhatsApp", text: "Metin", phone: "Telefon",
  };
  const typeColor = TYPE_COLORS[qr.qr_type ?? "url"] ?? "#6366f1";
  const date = new Date(qr.created_at);

  return (
    <div className={`group flex items-center gap-4 px-5 py-3.5 border-b transition-all
      ${isDark ? "border-slate-800 hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50/70"}
      ${selected ? isDark ? "bg-violet-950/20 border-l-2 border-l-violet-500 !border-b-slate-800" : "bg-violet-50/60 border-l-2 border-l-violet-400 !border-b-slate-100" : ""}
      ${!qr.is_active ? "opacity-50" : ""}`}>

      {/* Checkbox */}
      <button onClick={onSelect} className={`shrink-0 transition-colors ${isDark ? "text-slate-700 hover:text-violet-400" : "text-slate-300 hover:text-violet-500"}`}>
        {selected ? <CheckSquare size={14} className="text-violet-500"/> : <Square size={14}/>}
      </button>

      {/* QR Thumb */}
      <div className="shrink-0 hidden sm:block">
        <QRThumb slug={qr.short_slug}/>
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
          <a href={`${typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.short_slug}`}
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
        <button onClick={onStats} title="Analitik"
          className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}>
          <BarChart2 size={13}/>
        </button>
        <button onClick={onEdit} title="Düzenle"
          className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-violet-400 hover:bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"}`}>
          <Pencil size={13}/>
        </button>
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen(p => !p)}
            className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-slate-300 hover:bg-white/8" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
            <MoreHorizontal size={13}/>
          </button>
          {menuOpen && (
            <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-2xl z-40 overflow-hidden ${isDark ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200"}`}>
              <div className="p-1">
                {[
                  { icon: <Power size={11}/>, label: qr.is_active ? "Pasifleştir" : "Aktifleştir", fn: () => { onToggle(); setMenuOpen(false); } },
                  { icon: <FileImage size={11}/>, label: "PNG İndir", fn: () => { dlPng(qr, _styleMapRef); setMenuOpen(false); } },
                  { icon: <FilePdf size={11}/>, label: "PDF İndir", fn: () => { dlPdf(qr.short_slug, qr.title); setMenuOpen(false); } },
                  { icon: <Wand2 size={11}/>, label: "Tasarım Stüdyosu", fn: () => {}, href: `/dashboard/studio/${qr.id}` },
                  { icon: <Trash2 size={11}/>, label: "Sil", fn: () => { onDelete(); setMenuOpen(false); }, danger: true },
                ].map((item, i) => item.href ? (
                  <Link key={i} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>
                    {item.icon}{item.label}
                  </Link>
                ) : (
                  <button key={i} onClick={item.fn}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${item.danger ? "text-red-400 hover:bg-red-500/10" : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QR Grid Card ─────────────────────────────────────────────────────────────
function QRCard({ qr, selected, onSelect, onEdit, onDelete, onToggle, onStats, isDark }: {
  qr: QrCodeType; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void; onStats: () => void; isDark: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const TYPE_COLORS: Record<string, string> = {
    url: "#6366f1", vcard: "#8b5cf6", wifi: "#06b6d4", sms: "#10b981",
    email: "#f59e0b", whatsapp: "#25D366", text: "#64748b", phone: "#ef4444",
  };
  const typeColor = TYPE_COLORS[qr.qr_type ?? "url"] ?? "#6366f1";

  return (
    <div className={`group relative rounded-2xl border transition-all ${isDark
      ? selected ? "bg-violet-950/30 border-violet-500/50" : "bg-white/[0.02] border-slate-800 hover:border-slate-700"
      : selected ? "bg-violet-50 border-violet-300" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
    } ${!qr.is_active ? "opacity-50" : ""}`}>

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
          <QRThumb slug={qr.short_slug}/>
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
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen(p => !p)} className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-slate-300 hover:bg-white/8" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}><MoreHorizontal size={12}/></button>
          {menuOpen && (
            <div className={`absolute right-0 bottom-full mb-1.5 w-40 rounded-xl border shadow-2xl z-40 overflow-hidden ${isDark ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200"}`}>
              <div className="p-1">
                {[
                  { icon: <Power size={11}/>, label: qr.is_active ? "Pasifleştir" : "Aktifleştir", fn: () => { onToggle(); setMenuOpen(false); } },
                  { icon: <FileImage size={11}/>, label: "PNG İndir", fn: () => { dlPng(qr, _styleMapRef); setMenuOpen(false); } },
                  { icon: <Wand2 size={11}/>, label: "Stüdyo", fn: () => {}, href: `/dashboard/studio/${qr.id}` },
                  { icon: <Trash2 size={11}/>, label: "Sil", fn: () => { onDelete(); setMenuOpen(false); }, danger: true },
                ].map((item, i) => item.href ? (
                  <Link key={i} href={item.href} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors ${isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>{item.icon}{item.label}</Link>
                ) : (
                  <button key={i} onClick={item.fn} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${item.danger ? "text-red-400 hover:bg-red-500/10" : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>{item.icon}{item.label}</button>
                ))}
              </div>
            </div>
          )}
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

  const [activeSection, setActiveSection] = useState<"qrlist"|"templates"|"bulk"|"analytics">("qrlist");
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"date" | "scans" | "title">("date");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [styleMap, setStyleMap] = useState<Map<string, QrStyle>>(new Map());

  // Theme classes
  const pg = isDark ? "bg-[#080b14]" : "bg-[#f4f6f9]";
  const sidebar = isDark ? "bg-[#0c0f1a] border-slate-800" : "bg-white border-slate-200";
  const topbar = isDark ? "bg-[#0c0f1a]/95 border-slate-800" : "bg-white/95 border-slate-200";
  const card = isDark ? "bg-[#0c0f1a] border-slate-800" : "bg-white border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";
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
      const [codes, s, stylesArr] = await Promise.all([fetchQrCodes(), fetchDashboardStats(), fetchStyles()]);
      setQrs(codes); setStats(s);
      const sm = new Map(stylesArr.map(st => [st.id, st]));
      setStyleMap(sm);
      _styleMapRef = sm;
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
    } catch (e) { alert("Silme hatası: " + (e instanceof Error ? e.message : "Hata")); }
  }, [qrs]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`${selected.size} QR kodunu silmek istiyor musunuz?`)) return;
    setBulkLoading(true);
    try { await bulkDeleteQrCodes(Array.from(selected)); setQrs(p => p.filter(q => !selected.has(q.id))); setSelected(new Set()); }
    finally { setBulkLoading(false); }
  }, [selected]);

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
  }, [editTarget]);

  const filtered = qrs
    .filter(q => {
      const ms = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.short_slug.toLowerCase().includes(search.toLowerCase());
      const mst = filterStatus === "all" || (filterStatus === "active" ? q.is_active : !q.is_active);
      return ms && mst;
    })
    .sort((a, b) => {
      if (sortBy === "scans") return b.scan_count - a.scan_count;
      if (sortBy === "title") return a.title.localeCompare(b.title, "tr");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Sidebar nav items
  const navGroups = [
    {
      label: "QR KODLARIM",
      items: [
        { icon: <List size={15}/>, label: "QR Listesi", section: "qrlist" as const },
        { icon: <BarChart2 size={15}/>, label: "Analitik", section: "analytics" as const },
        { icon: <Star size={15}/>, label: "Şablonlar", section: "templates" as const },
      ]
    },
    {
      label: "ARAÇLAR",
      items: [
        { icon: <FileSpreadsheet size={15}/>, label: "Toplu Yükleme", section: "bulk" as const },
        { icon: <Wand2 size={15}/>, label: "Tasarım Stüdyosu", section: null, href: "/dashboard/studio" },
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

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b ${topbar} backdrop-blur-xl`}>
        {/* Logo */}
        <div className="flex items-center gap-3 w-56 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <QrCode size={15} className="text-white"/>
          </div>
          <span className={`font-black text-base tracking-tight ${tx}`}>
            QR<span className="text-violet-500">Hub</span>
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
            <input
              placeholder="QR kodlarında ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all ${inputCls}`}
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 w-56 justify-end">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/30" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          {currentUserRole === "admin" && (
            <Link href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${isDark ? "border-violet-800/40 text-violet-400 hover:bg-violet-900/20" : "border-violet-200 text-violet-600 hover:bg-violet-50"}`}>
              <Shield size={12}/> Admin
            </Link>
          )}
          <button onClick={handleLogout}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-900/40" : "border-slate-200 text-slate-400 hover:text-red-500"}`}>
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      <div className="flex pt-14 flex-1">

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside className={`fixed left-0 top-14 bottom-0 w-56 border-r ${sidebar} flex flex-col z-30 overflow-y-auto`}>
          {/* Create button */}
          <div className="p-3">
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg shadow-violet-900/20 transition-all">
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
                    <button key={item.label} onClick={() => item.section && setActiveSection(item.section)}
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-black">{(currentUserEmail[0] ?? "U").toUpperCase()}</span>
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
            <div className={`rounded-2xl border ${card} p-10 text-center`}>
              <BarChart2 size={32} className="mx-auto mb-3 text-violet-400"/>
              <p className={`font-bold ${tx}`}>Analitik yakında geliyor</p>
              <p className={`text-sm ${sub} mt-1`}>QR kodlarınıza tıklayarak detaylı analitik görüntüleyebilirsiniz.</p>
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
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 transition-all">
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
          <div className={`rounded-2xl border ${card} overflow-hidden`}>

            {/* Toolbar */}
            <div className={`px-5 py-3 border-b ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center gap-3 flex-wrap`}>
              {/* Status filter pills */}
              <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${isDark ? "bg-white/[0.03] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                {(["all", "active", "inactive"] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${filterStatus === s
                      ? "bg-violet-600 text-white shadow-sm"
                      : `${sub} hover:${isDark ? "text-slate-300" : "text-slate-600"}`}`}>
                    {s === "all" ? "Tümü" : s === "active" ? "Aktif" : "Pasif"}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className={`text-xs border rounded-xl px-3 py-2 outline-none transition-all cursor-pointer ${isDark ? "bg-white/5 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>
                <option value="date">Yeniden eskiye</option>
                <option value="scans">En çok taranan</option>
                <option value="title">İsme göre</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                {/* Bulk actions */}
                {selected.size > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? "bg-violet-950/30 border-violet-800/30" : "bg-violet-50 border-violet-200"}`}>
                    <span className={`text-xs font-bold ${isDark ? "text-violet-300" : "text-violet-700"}`}>{selected.size} seçili</span>
                    <button onClick={() => { filtered.filter(q => selected.has(q.id)).forEach(q => dlPng(q, styleMap)); }}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-indigo-300" : "border-slate-200 text-slate-500"}`}>
                      <FileImage size={10}/> PNG
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
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-violet-600 text-white" : sub}`}><List size={12}/></button>
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-violet-600 text-white" : sub}`}><LayoutGrid size={12}/></button>
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
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 size={24} className="animate-spin text-violet-400"/>
                <p className={`text-sm ${sub}`}>Yükleniyor…</p>
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/20">
                    <Plus size={14}/> QR Kodu Oluştur
                  </button>
                )}
              </div>
            ) : viewMode === "list" ? (
              <div>
                {/* Table header */}
                <div className={`hidden md:flex items-center gap-4 px-5 py-2.5 ${isDark ? "bg-white/[0.02] border-b border-slate-800" : "bg-slate-50/80 border-b border-slate-100"}`}>
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
                    onSelect={() => setSelected(p => { const n = new Set(p); n.has(qr.id) ? n.delete(qr.id) : n.add(qr.id); return n; })}
                    onEdit={() => setEditTarget(qr)} onDelete={() => handleDelete(qr.id)}
                    onToggle={() => handleToggle(qr)} onStats={() => setStatsTarget(qr)}/>
                ))}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(qr => (
                  <QRCard key={qr.id} qr={qr} selected={selected.has(qr.id)} isDark={isDark}
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
        <AnalyticsDrawer qr={statsTarget} onClose={() => setStatsTarget(null)} isDark={isDark} styleMap={styleMap}/>
      )}
    </div>
  );
}

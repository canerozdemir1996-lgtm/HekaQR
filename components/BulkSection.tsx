"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, FileSpreadsheet, X, CheckCircle2,
  AlertCircle, Loader2, Download, Play, Palette, ChevronDown,
  FileText, Trash2, RotateCcw, LockKeyhole, ArrowRight, PauseCircle,
} from "lucide-react";
import {
  createBulkTemplateXlsx,
  BULK_COLUMN_FIELDS,
  parseBulkCsv,
  parseBulkTable,
  type BulkColumnKey,
  type BulkColumnMapping,
  type BulkParseResult,
  type BulkRow,
} from "@/lib/bulk-import";
import { parseBulkFileInBrowser } from "@/lib/bulk-import-browser";
import {
  fetchStyles,
  fetchBulkImports,
  fetchDashboardPlanInfo,
  bulkCreateQrCodes,
  resumeBulkImport,
  retryBulkImport,
  type QrStyle,
  type BulkResult,
  type BulkImportBatch,
  type DashboardPlanInfo,
} from "@/lib/supabase";
import { supportsQrMode, type QrMode } from "@/lib/qr-capabilities";

const PREVIEW_PAGE_SIZE = 100;
const BULK_STATUS_LABELS: Record<BulkImportBatch["status"], string> = {
  ready: "Hazır",
  processing: "İşleniyor",
  partial: "Kısmen tamamlandı",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal edildi",
};

function rowSummary(row: BulkRow) {
  switch (row.type) {
    case "url": return row.fields.url;
    case "wifi": return `Wi-Fi: ${row.fields.ssid}`;
    case "vcard": return `vCard: ${row.fields.firstName} ${row.fields.lastName || ""}`.trim();
    case "phone": return `tel:${row.fields.phone}`;
    case "text": return row.fields.text;
    case "email": return `mailto:${row.fields.email}`;
    case "sms": return `sms:${row.fields.phone}`;
    default: return "";
  }
}

// ── Template Picker ───────────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect, isDark, disabled = false }: {
  templates: QrStyle[]; selected: string | null;
  onSelect: (id: string | null) => void; isDark: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sel = templates.find(t => t.id === selected);
  const bdr = isDark ? "border-[#333] bg-[#111]" : "border-gray-200 bg-white";
  const tx = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} aria-expanded={open && !disabled} onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border ${bdr} transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-gray-500`}>
        <Palette size={14} className={sel ? (isDark ? "text-white" : "text-black") : sub} />
        <span className={`flex-1 text-left text-sm font-medium ${sel ? (isDark ? "text-white" : "text-black") : sub}`}>
          {sel ? sel.name : "Şablon seçin (opsiyonel)"}
        </span>
        <ChevronDown size={14} className={`${sub} transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className={`absolute top-full mt-2 left-0 right-0 z-50 border rounded-lg shadow-lg overflow-hidden ${isDark ? "bg-[#111] border-[#333]" : "bg-white border-gray-200"}`}>
          <button onClick={() => { onSelect(null); setOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium border-b transition-colors ${isDark ? "text-gray-400 hover:bg-[#222] border-[#333] hover:text-white" : "text-gray-600 hover:bg-gray-50 border-gray-200 hover:text-black"}`}>
            <X size={12}/> Şablon olmadan
          </button>
          <div className="max-h-52 overflow-y-auto">
            {templates.length === 0 ? (
              <div className={`px-4 py-4 text-sm font-medium ${sub} text-center`}>
                Şablon yok.{" "}
                <Link href="/dashboard/templates" className="text-black dark:text-white hover:underline">Oluştur →</Link>
              </div>
            ) : templates.map(t => (
              <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium transition-colors ${selected === t.id
                  ? isDark ? "text-white bg-[#222]" : "text-black bg-gray-100"
                  : isDark ? "text-gray-300 hover:bg-[#222] hover:text-white" : "text-gray-600 hover:bg-gray-50 hover:text-black"}`}>
                <Palette size={14} className="shrink-0" />
                <span className="flex-1 text-left truncate">{t.name}</span>
                {selected === t.id && <CheckCircle2 size={14} className="shrink-0"/>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────
function ResultView({ result, isDark }: { result: BulkResult; isDark: boolean }) {
  const downloadErrors = () => {
    const escape = (value: string | number) => {
      const raw = String(value);
      const spreadsheetSafe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
    };
    const csv = [
      ["row", "title", "error"].join(","),
      ...result.failed.map(item => [item.row, item.title, item.error].map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qrpublish-bulk-hatalar-${result.importBatchId ?? "rapor"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in mt-6" role="status" aria-live="polite">
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-[1.5rem] border p-5 flex items-center gap-4 shadow-sm ${isDark ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"}`}>
          <CheckCircle2 size={24} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
          <div>
            <p className={`text-3xl font-black ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{result.success}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-emerald-500" : "text-emerald-500"}`}>Oluşturuldu</p>
          </div>
        </div>
        <div className={`rounded-[1.5rem] border p-5 flex items-center gap-4 shadow-sm ${result.failed.length > 0
          ? isDark ? "border-rose-500/30 bg-rose-500/10" : "border-rose-200 bg-rose-50"
          : isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
          <AlertCircle size={24} strokeWidth={2.5} className={result.failed.length > 0 ? "text-rose-500 shrink-0" : `${isDark ? "text-slate-600" : "text-slate-400"} shrink-0`} />
          <div>
            <p className={`text-3xl font-black ${result.failed.length > 0 ? (isDark ? "text-rose-400" : "text-rose-600") : isDark ? "text-slate-500" : "text-slate-400"}`}>{result.failed.length}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Başarısız</p>
          </div>
        </div>
      </div>
      {result.failed.length > 0 && (
        <div className={`rounded-[1.5rem] border p-5 space-y-2 ${isDark ? "border-rose-500/30 bg-rose-500/5" : "border-rose-200 bg-rose-50"}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Hata Detayları:</p>
            <button type="button" onClick={downloadErrors} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/20">
              <Download size={12}/> CSV İndir
            </button>
          </div>
          {result.failed.map((f, i) => (
            <div key={i} className={`text-sm font-medium ${isDark ? "text-rose-300/80" : "text-rose-700"}`}>
              <span className="font-bold opacity-70 mr-2">Satır {f.row}:</span> {f.title} <span className="opacity-60 text-xs ml-1">({f.error})</span>
            </div>
          ))}
        </div>
      )}
      {result.importBatchId && <p className={`text-center text-[10px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>Import Batch: {result.importBatchId}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type BulkSectionProps = {
  isDark: boolean;
  onBack?: () => void;
  presentation?: "page" | "embedded";
};

export function BulkSection({ isDark, onBack, presentation = "page" }: BulkSectionProps) {
  const [templates, setTemplates] = useState<QrStyle[]>([]);
  const [history, setHistory] = useState<BulkImportBatch[]>([]);
  const [planInfo, setPlanInfo] = useState<DashboardPlanInfo | null>(null);
  const [planResolved, setPlanResolved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<QrMode>("static");
  const [csvText, setCsvText] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [sourceFormat, setSourceFormat] = useState<"csv" | "xlsx">("csv");
  const [sourceTable, setSourceTable] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<BulkColumnMapping>({});
  const [preview, setPreview] = useState<BulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryingBatchId, setRetryingBatchId] = useState<string | null>(null);
  const [resumingBatchId, setResumingBatchId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);
  const [pausedMessage, setPausedMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isEmbedded = presentation === "embedded";
  const bulkAvailable = planInfo?.limits.bulk_upload !== false;
  const bulkControlsDisabled = !planResolved || !bulkAvailable || loading;

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await fetchBulkImports(8));
      setHistoryError("");
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "İçe aktarma geçmişi yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    fetchStyles().then(setTemplates).catch(() => {});
    fetchDashboardPlanInfo().then(setPlanInfo).catch(() => {}).finally(() => setPlanResolved(true));
    void refreshHistory();
  }, [refreshHistory]);

  const applyParsedResult = useCallback((parsed: BulkParseResult) => {
    setSourceTable(parsed.table);
    setColumnMapping(parsed.mapping);
    setPreview(parsed.rows);
    setPreviewPage(0);
    setParseErrors(parsed.issues.map(issue => issue.message));
  }, []);

  const handleCSV = useCallback((text: string) => {
    setCsvText(text); setSourceFileName(""); setResult(null); setPausedMessage("");
    const parsed = parseBulkCsv(text);
    setSourceFormat("csv");
    idempotencyKeyRef.current = crypto.randomUUID();
    applyParsedResult(parsed);
  }, [applyParsedResult]);

  const handleFile = useCallback(async (file: File) => {
    setResult(null);
    setPausedMessage("");
    setParsingFile(true);
    try {
      const parsed = await parseBulkFileInBrowser(file);
      setSourceFileName(file.name);
      setSourceFormat(parsed.sourceFormat);
      idempotencyKeyRef.current = crypto.randomUUID();
      setCsvText(parsed.sourceFormat === "csv" ? await file.text() : "");
      applyParsedResult(parsed);
    } catch (error) {
      setSourceFileName(file.name);
      setPreview([]);
      setParseErrors([error instanceof Error ? error.message : "Dosya okunamadı."]);
    } finally {
      setParsingFile(false);
    }
  }, [applyParsedResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (bulkControlsDisabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [bulkControlsDisabled, handleFile]);

  const handleSubmit = useCallback(async () => {
    if (preview.length === 0) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setPausedMessage("");
    setLoading(true);
    try {
      const r = await bulkCreateQrCodes(preview, {
        styleId: selectedTemplate,
        sourceFileName: sourceFileName || null,
        sourceFormat,
        qrMode,
        idempotencyKey: idempotencyKeyRef.current ?? crypto.randomUUID(),
        signal: controller.signal,
      });
      setResult(r);
      if (r.success > 0 && r.failed.length === 0) {
        setCsvText(""); setSourceFileName(""); setSourceTable([]); setColumnMapping({});
        setPreview([]); setParseErrors([]);
        idempotencyKeyRef.current = null;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setResult(null);
        setPausedMessage("İşlem bu cihazda duraklatıldı. Tamamlanan satırlar korunur; Son İçe Aktarmalar bölümünden devam edebilirsiniz.");
      } else {
        setResult({ success: 0, failed: [{ row: 0, title: "Tüm satırlar", error: e instanceof Error ? e.message : "Hata" }], created: [] });
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setLoading(false);
      await refreshHistory();
      fetchDashboardPlanInfo({ force: true }).then(setPlanInfo).catch(() => {});
    }
  }, [preview, selectedTemplate, sourceFileName, sourceFormat, qrMode, refreshHistory]);

  const pauseImport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRetry = useCallback(async (batchId: string) => {
    setRetryingBatchId(batchId);
    setResult(null);
    try {
      setResult(await retryBulkImport(batchId));
    } catch (error) {
      setResult({
        success: 0,
        failed: [{ row: 0, title: "Retry", error: error instanceof Error ? error.message : "Retry tamamlanamadı." }],
        created: [],
        importBatchId: batchId,
      });
    } finally {
      setRetryingBatchId(null);
      await refreshHistory();
    }
  }, [refreshHistory]);

  const handleResume = useCallback(async (batchId: string) => {
    setResumingBatchId(batchId);
    setResult(null);
    try {
      setResult(await resumeBulkImport(batchId));
    } catch (error) {
      setResult({
        success: 0,
        failed: [{ row: 0, title: "Devam ettirme", error: error instanceof Error ? error.message : "İçe aktarma devam ettirilemedi." }],
        created: [],
        importBatchId: batchId,
      });
    } finally {
      setResumingBatchId(null);
      await refreshHistory();
    }
  }, [refreshHistory]);

  const handleMappingChange = useCallback((key: BulkColumnKey, columnIndex: number) => {
    const nextMapping = { ...columnMapping, [key]: columnIndex };
    setColumnMapping(nextMapping);
    const parsed = parseBulkTable(sourceTable, sourceFormat, nextMapping);
    setPreview(parsed.rows);
    setPreviewPage(0);
    setParseErrors(parsed.issues.map(issue => issue.message));
    idempotencyKeyRef.current = crypto.randomUUID();
  }, [columnMapping, sourceFormat, sourceTable]);

  const downloadSample = async (format: "csv" | "xlsx") => {
    const csv = [
      "title,type,url,ssid,password,security,firstName,lastName,phone,email,company,text,subject,body",
      "Yaz Kampanyası,url,https://example.com/yaz-kampanya,,,,,,,,,,,",
      "Mağaza Wi-Fi,wifi,,MagazaWifi,sifre123,WPA,,,,,,,,",
      "Ahmet Yılmaz,vcard,,,,,Ahmet,Yılmaz,+905551234567,ahmet@example.com,Acme A.Ş.,,,",
      "Destek Hattı,phone,,,,,,,+905551234567,,,,,",
    ].join("\n");
    const blob = format === "xlsx"
      ? new Blob([await createBulkTemplateXlsx()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      : new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `qrpublish-bulk-sablon.${format}`; a.click();
    URL.revokeObjectURL(a.href);
  };

  const reset = () => {
    if (loading) return;
    setCsvText(""); setSourceFileName(""); setSourceTable([]); setColumnMapping({});
    setPreview([]); setParseErrors([]); setResult(null);
    setPreviewPage(0);
    if (fileRef.current) fileRef.current.value = "";
    idempotencyKeyRef.current = null;
    setPausedMessage("");
  };
  const hasSource = Boolean(sourceFileName || csvText);
  const updatePreviewTitle = (index: number, title: string) => {
    setPreview(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, title } : row));
    idempotencyKeyRef.current = crypto.randomUUID();
  };
  const removePreviewRow = (index: number) => {
    setPreview(rows => rows.filter((_, rowIndex) => rowIndex !== index));
    idempotencyKeyRef.current = crypto.randomUUID();
  };
  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    idempotencyKeyRef.current = crypto.randomUUID();
  };
  const handleQrModeChange = (mode: QrMode) => {
    setQrMode(mode);
    idempotencyKeyRef.current = crypto.randomUUID();
  };
  const unsupportedModeRows = preview.filter(row => !supportsQrMode(row.type, qrMode));
  const previewPageCount = Math.max(1, Math.ceil(preview.length / PREVIEW_PAGE_SIZE));
  const safePreviewPage = Math.min(previewPage, previewPageCount - 1);
  const previewStart = safePreviewPage * PREVIEW_PAGE_SIZE;
  const visiblePreview = preview.slice(previewStart, previewStart + PREVIEW_PAGE_SIZE);
  const currentStep = loading || result ? 4 : preview.length > 0 ? 3 : hasSource || parsingFile ? 2 : 1;

  // Theme
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";
  const card = isDark ? "bg-[#0b1121]/60 border-white/10 shadow-xl shadow-black/10 backdrop-blur-2xl" : "bg-white/80 border-slate-200/60 shadow-xl shadow-slate-200/40 backdrop-blur-2xl";
  const inp = isDark ? "bg-[#020617]/50 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" : "bg-white/50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50";
  const lbl = `text-[10px] font-bold uppercase tracking-widest ${sub}`;

  return (
    <div className={`${isEmbedded ? "relative" : "min-h-screen bg-slate-50 dark:bg-[#020617]"} text-slate-900 dark:text-slate-200 transition-colors duration-500 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden`}>
      {/* Ambient Glows */}
      {!isEmbedded && <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/10 dark:bg-teal-600/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
      </div>}

      <header className={`relative z-40 max-w-6xl mx-auto ${isEmbedded ? "" : "px-4 sm:px-6 pt-6"}`}>
        <div className={`flex items-center justify-between gap-4 px-6 py-4 rounded-[2rem] border transition-all duration-300 ${isDark ? "bg-[#0b1121]/60 border-white/10 backdrop-blur-2xl shadow-xl shadow-black/20" : "bg-white/70 border-slate-200/50 backdrop-blur-2xl shadow-xl shadow-slate-200/20"}`}>
          <div className="flex items-center gap-4">
            {onBack && (
              <button type="button" aria-label="Dashboard'a dön" disabled={loading} onClick={onBack} className={`flex items-center justify-center w-10 h-10 rounded-[1.25rem] transition-all shadow-sm active:scale-95 disabled:cursor-wait disabled:opacity-50 ${isDark ? "bg-[#020617] border border-white/10 text-slate-400 hover:bg-white/5" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <ArrowLeft size={18}/>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <FileSpreadsheet size={18} className="text-white"/>
              </div>
              <span className="font-black text-lg tracking-tight hidden sm:block">Toplu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Oluşturucu</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["csv", "xlsx"] as const).map(format => (
              <button type="button" key={format} onClick={() => void downloadSample(format)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${isDark ? "border-white/10 bg-[#020617] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600"}`}>
                <Download size={15}/> Örnek {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main aria-busy={loading || parsingFile} className={`relative z-10 max-w-6xl mx-auto space-y-8 ${isEmbedded ? "py-6" : "px-4 sm:px-6 py-10"}`}>
        {/* How it works */}
        {!isEmbedded && <div className={`rounded-[2.5rem] border ${card} p-8 animate-fade-in`}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={`font-black text-xl ${tx} tracking-tight`}>4 Adımda Toplu QR Oluştur</h2>
              <p className={`mt-1 text-sm font-medium ${sub}`}>Dosyanı yükle, satırları doğrula, önizlemeyi kontrol et ve üret.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`} role="status" aria-live="polite">
              Adım {currentStep} / 4
            </span>
          </div>
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Toplu QR oluşturma adımları">
            {[
              { n: 1, t: "Dosya", d: "CSV/XLSX yükle", c: "text-violet-500" },
              { n: 2, t: "Doğrula", d: "Kolonları eşleştir", c: "text-sky-500" },
              { n: 3, t: "Önizle", d: "Satırları kontrol et", c: "text-emerald-500" },
              { n: 4, t: "Oluştur", d: "Sonucu ve hataları izle", c: "text-amber-500" },
            ].map(s => (
              <li
                key={s.n}
                aria-current={currentStep === s.n ? "step" : undefined}
                className={`rounded-[1.25rem] border p-4 transition ${
                  currentStep === s.n
                    ? isDark ? "border-emerald-400/60 bg-emerald-500/10" : "border-emerald-300 bg-emerald-50"
                    : currentStep > s.n
                      ? isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
                      : isDark ? "border-white/10 bg-black/10 opacity-60" : "border-slate-200 bg-white opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${currentStep > s.n ? "bg-emerald-500 text-white" : isDark ? "bg-black/30" : "bg-white shadow-sm"} ${s.c}`}>
                    {currentStep > s.n ? <CheckCircle2 size={16} className="text-white"/> : s.n}
                  </span>
                  <span>
                    <span className={`block text-sm font-black ${tx}`}>{s.t}</span>
                    <span className={`block text-[11px] font-medium ${sub}`}>{s.d}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>}

        {isEmbedded && (
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
            <span className={`text-sm font-black ${tx}`}>Toplu oluşturma</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`} role="status" aria-live="polite">Adım {currentStep} / 4</span>
          </div>
        )}

        {!planResolved && (
          <div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
            <Loader2 size={17} className="animate-spin text-emerald-500"/> Paket ve toplu oluşturma limitleri kontrol ediliyor…
          </div>
        )}

        {planResolved && !bulkAvailable && (
          <section role="alert" className={`flex flex-col gap-4 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-amber-400/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-amber-400/15 text-amber-300" : "bg-white text-amber-600 shadow-sm"}`}>
                <LockKeyhole size={20}/>
              </span>
              <div>
                <h2 className={`font-black ${tx}`}>Toplu oluşturma {planInfo?.plan_label ?? "mevcut"} paketinde kapalı</h2>
                <p className={`mt-1 text-sm font-medium ${sub}`}>Dosyanı hazırlamadan önce bilmen için: toplu CSV/XLSX yükleme Starter ve üzeri paketlerde kullanılabilir.</p>
              </div>
            </div>
            <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400">
              Paketleri Gör <ArrowRight size={16}/>
            </Link>
          </section>
        )}

        {planResolved && bulkAvailable && planInfo && (
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-5 py-3 text-xs font-bold ${isDark ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            <span>{planInfo.plan_label} paketiyle toplu oluşturma açık.</span>
            <span>{planInfo.usage.bulk_qr_remaining === null
              ? "Bu ay kalan: sınırsız"
              : typeof planInfo.usage.bulk_qr_remaining === "number"
                ? `Bu ay kalan: ${planInfo.usage.bulk_qr_remaining.toLocaleString("tr-TR")} / ${(planInfo.usage.bulk_qr_limit ?? planInfo.limits.max_bulk_qr_per_month ?? 0).toLocaleString("tr-TR")}`
                : typeof planInfo.limits.max_bulk_qr_per_month === "number"
                  ? `Aylık limit: ${planInfo.limits.max_bulk_qr_per_month.toLocaleString("tr-TR")}`
                  : "Kesin limit oluşturma sırasında doğrulanır"}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT */}
          <div className={`space-y-6 rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '100ms' }}>
            <fieldset disabled={bulkControlsDisabled}>
              <legend className={`${lbl} mb-2`}>QR Oluşturma Modu</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: "static" as const, title: "Statik", description: "Tüm toplu QR tipleriyle uyumlu." },
                  { value: "dynamic" as const, title: "Dinamik", description: "URL, vCard ve e-posta için düzenlenebilir." },
                ]).map(option => (
                  <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 transition ${qrMode === option.value ? isDark ? "border-emerald-400 bg-emerald-500/10" : "border-emerald-400 bg-emerald-50" : isDark ? "border-white/10 bg-black/10 hover:border-white/20" : "border-slate-200 bg-white hover:border-emerald-200"}`}>
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="bulk-qr-mode"
                        value={option.value}
                        checked={qrMode === option.value}
                        onChange={() => handleQrModeChange(option.value)}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                      />
                      <span>
                        <span className={`block text-sm font-black ${tx}`}>{option.title}</span>
                        <span className={`mt-1 block text-xs font-medium leading-relaxed ${sub}`}>{option.description}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Drop zone */}
            <div>
              <p className={`${lbl} mb-2`}>CSV veya XLSX Dosyası</p>
              <div
                onDragOver={e => { e.preventDefault(); if (!bulkControlsDisabled) setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                aria-disabled={bulkControlsDisabled}
                className={`relative rounded-[2rem] border-2 border-dashed transition-all duration-300 focus-within:ring-4 focus-within:ring-emerald-500/20 ${bulkControlsDisabled ? "cursor-not-allowed opacity-55" : ""} ${
                  dragOver ? "border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
                  hasSource ? isDark ? "border-emerald-500/50 bg-emerald-500/5" : "border-emerald-400 bg-emerald-50" :
                  isDark ? "border-white/10 hover:border-white/20 bg-[#020617]/50 hover:bg-white/5" : "border-slate-300 hover:border-emerald-300 bg-slate-50/50 hover:bg-white"
                }`}>
                <input
                  id="bulk-qr-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  aria-describedby="bulk-file-hint"
                  disabled={parsingFile || bulkControlsDisabled}
                  className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                />
                <label htmlFor="bulk-qr-file" className={`flex flex-col items-center gap-4 p-10 text-center ${bulkControlsDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  {parsingFile ? (
                    <>
                      <span className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Loader2 size={32} className="text-emerald-500 animate-spin"/>
                      </span>
                      <span className={`text-lg font-black ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Dosya arka planda işleniyor…</span>
                      <span className={`text-sm font-medium ${sub}`}>Büyük XLSX dosyalarında arayüzü kullanmaya devam edebilirsin.</span>
                    </>
                  ) : hasSource ? (
                    <>
                      <span className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                        <CheckCircle2 size={32} className="text-emerald-500"/>
                      </span>
                      <span className={`text-lg font-black ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Dosya hazır</span>
                      <span className={`text-sm font-medium ${sub}`}>{sourceFileName || "Yapıştırılan CSV"} · {preview.length} geçerli satır {parseErrors.length > 0 ? `· ${parseErrors.length} uyarı` : ""}</span>
                    </>
                  ) : (
                    <>
                      <span className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${isDark ? "bg-[#020617] border border-white/10" : "bg-white border border-slate-200"}`}>
                        <Upload size={28} className={isDark ? "text-slate-400" : "text-slate-500"} strokeWidth={2}/>
                      </span>
                      <span>
                        <span className={`block text-base font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Dosyayı buraya sürükle veya seç</span>
                        <span className={`mt-2 block text-xs font-medium ${sub}`}>CSV veya XLSX · Maksimum 10 MB / 5.000 satır</span>
                      </span>
                    </>
                  )}
                </label>
                <span id="bulk-file-hint" className="sr-only">CSV veya XLSX dosyası. Maksimum 10 MB ve 5.000 satır.</span>
                <p className="sr-only" role="status" aria-live="polite">
                  {parsingFile ? "Dosya işleniyor." : hasSource ? `${preview.length} geçerli satır yüklendi.` : "Dosya seçilmedi."}
                </p>
                {hasSource && !parsingFile && (
                  <div className="flex justify-center px-4 pb-6">
                    <button type="button" onClick={reset} disabled={loading}
                      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-white/5 hover:bg-rose-500/20 hover:text-rose-400" : "bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"}`}><X size={14}/> Dosyayı Kaldır</button>
                  </div>
                )}
              </div>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div role="alert" aria-labelledby="bulk-parse-errors" className={`rounded-[1.5rem] border p-4 space-y-1.5 shadow-sm ${isDark ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                <p id="bulk-parse-errors" className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2"><AlertCircle size={14}/> {parseErrors.length} Uyarı</p>
                <ul className="space-y-1.5">
                  {parseErrors.slice(0, 5).map((error, index) => <li key={index} className={`text-xs font-medium ${isDark ? "text-amber-200/80" : "text-amber-700"}`}>{error}</li>)}
                </ul>
                {parseErrors.length > 5 && <p className={`text-xs font-bold ${sub}`}>+{parseErrors.length - 5} daha…</p>}
              </div>
            )}

            {hasSource && sourceTable.length > 1 && (
              <details className={`rounded-[1.5rem] border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
                <summary className={`cursor-pointer text-xs font-black uppercase tracking-widest ${tx}`}>
                  Kolonları Eşleştir
                </summary>
                <p className={`mt-2 text-xs leading-relaxed ${sub}`}>
                  Otomatik seçimleri kontrol edin. Başlık zorunludur; tip kolonu yoksa URL tipi kullanılır.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {BULK_COLUMN_FIELDS.map(field => (
                    <label key={field.key} className="space-y-1.5">
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${sub}`}>
                        {field.label}{field.key === "title" ? " *" : ""}
                      </span>
                      <select
                        aria-label={`${field.label} kolonu`}
                        disabled={loading}
                        value={columnMapping[field.key] ?? -1}
                        onChange={event => handleMappingChange(field.key, Number(event.target.value))}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${inp}`}
                      >
                        <option value={-1}>Eşleştirme yok</option>
                        {(sourceTable[0] ?? []).map((header, index) => (
                          <option key={`${index}-${header}`} value={index}>
                            {index + 1}. {header || "Adsız kolon"}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Template picker */}
            <div>
              <p className={`${lbl} mb-2`}>Tasarım Şablonu</p>
              <TemplatePicker templates={templates} selected={selectedTemplate} onSelect={handleTemplateSelect} isDark={isDark} disabled={loading}/>
              {!selectedTemplate && (
                <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 mt-3 px-2">
                  <Palette size={14}/> Yeni şablon stüdyosu →
                </Link>
              )}
            </div>

            {/* Manual paste */}
            <div>
              <label htmlFor="bulk-csv-paste" className={`${lbl} mb-2 block`}>Ya da Direkt Yapıştır</label>
              <textarea
                id="bulk-csv-paste"
                value={csvText}
                onChange={e => handleCSV(e.target.value)}
                disabled={bulkControlsDisabled}
                placeholder={"title,type,url\nÜrün Sayfası,url,https://example.com/urun\nBlog,url,https://example.com/blog\n\n(type sütunu olmazsa tümü url kabul edilir. Diğer tipler: wifi, vcard, phone, text, email, sms — örnek dosyayı indirin)"}
                rows={8}
                className={`min-h-52 w-full rounded-[1.5rem] border px-5 py-4 font-mono text-xs leading-5 outline-none transition-all shadow-inner disabled:cursor-not-allowed disabled:opacity-50 ${inp}`}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className={`space-y-6 rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '200ms' }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className={lbl}>Önizleme {preview.length > 0 && <span className={`normal-case font-normal ${sub}`}>({preview.length} QR oluşturulacak)</span>}</p>
                {preview.length > 0 && (
                  <button type="button" onClick={reset} disabled={loading} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}><Trash2 size={12}/> Listeyi Sil</button>
                )}
              </div>
              {unsupportedModeRows.length > 0 && (
                <div role="alert" className={`mb-4 rounded-2xl border p-4 ${isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                  <p className="text-sm font-black">{unsupportedModeRows.length} satır dinamik modu desteklemiyor</p>
                  <p className="mt-1 text-xs font-medium opacity-80">Wi-Fi, telefon, metin ve SMS satırları statik oluşturulmalıdır.</p>
                  <button type="button" disabled={loading} onClick={() => handleQrModeChange("static")} className="mt-3 rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white hover:bg-rose-400 disabled:opacity-50">
                    Statik moda geç
                  </button>
                </div>
              )}
              <div className={`rounded-[1.5rem] border overflow-hidden ${isDark ? "border-white/10 bg-[#020617]/50" : "border-slate-200 bg-white"}`}>
                {preview.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                      <FileText size={28} className={isDark ? "text-slate-600" : "text-slate-300"}/>
                    </div>
                    <p className={`text-sm font-medium ${sub}`}>CSV/XLSX yüklendiğinde liste burada belirecek.</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-5 py-3 border-b shadow-sm ${isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100"}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Başlık</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>İçerik</span>
                      <span className="sr-only">İşlem</span>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                      {visiblePreview.map((row, localIndex) => {
                        const rowIndex = previewStart + localIndex;
                        return (
                          <div key={row.source_row ?? rowIndex} className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{row.type}</span>
                            <input
                              aria-label={`Satır ${row.source_row ?? rowIndex + 1} başlığı`}
                              value={row.title}
                              maxLength={255}
                              disabled={loading}
                              onChange={event => updatePreviewTitle(rowIndex, event.target.value)}
                              className={`min-w-0 w-full rounded-lg border px-2 py-1 text-sm font-bold outline-none ${inp}`}
                            />
                          </div>
                          <p className={`text-xs font-mono truncate ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{rowSummary(row)}</p>
                          <button
                            type="button"
                            disabled={loading}
                            aria-label={`Satır ${row.source_row ?? rowIndex + 1} kaydını kaldır`}
                            onClick={() => removePreviewRow(rowIndex)}
                            className={`rounded-lg p-2 transition-colors ${isDark ? "text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"}`}
                          >
                            <Trash2 size={14}/>
                          </button>
                          </div>
                        );
                      })}
                    </div>
                    {previewPageCount > 1 && (
                      <div className={`flex items-center justify-between gap-3 border-t px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                        <button type="button" disabled={safePreviewPage === 0} onClick={() => setPreviewPage(page => Math.max(0, page - 1))} className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Önceki</button>
                        <span className={`text-[11px] font-bold ${sub}`}>{previewStart + 1}–{Math.min(previewStart + PREVIEW_PAGE_SIZE, preview.length)} / {preview.length}</span>
                        <button type="button" disabled={safePreviewPage >= previewPageCount - 1} onClick={() => setPreviewPage(page => Math.min(previewPageCount - 1, page + 1))} className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Sonraki</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Summary */}
            {preview.length > 0 && (
              <div className={`rounded-[1.5rem] border p-5 space-y-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"}`}>
                {[
                  { k: "Oluşturulacak QR", v: preview.length.toString(), bold: true },
                  { k: "QR Modu", v: qrMode === "static" ? "Statik" : "Dinamik" },
                  { k: "Tasarım Şablonu", v: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name ?? "Seçili" : "Yok (varsayılan)" },
                  { k: "Geçerli Satır", v: `${preview.length}` },
                  unsupportedModeRows.length > 0 ? { k: "Mod Uyumsuzluğu", v: `${unsupportedModeRows.length} satır`, warn: true } : null,
                  parseErrors.length > 0 ? { k: "Uyarı", v: `${parseErrors.length} satır atlanacak`, warn: true } : null,
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} className="flex justify-between text-xs">
                    <span className={`font-medium ${sub}`}>{row.k}</span>
                    <span className={row.warn ? "text-amber-500 font-bold" : row.bold ? `font-black text-sm ${tx}` : isDark ? "text-slate-300 font-semibold" : "text-slate-600 font-semibold"}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button type="button" onClick={handleSubmit} disabled={preview.length === 0 || loading || bulkControlsDisabled || unsupportedModeRows.length > 0}
              aria-describedby={unsupportedModeRows.length > 0 ? "bulk-submit-mode-help" : undefined}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-base font-black text-white transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(16,185,129,0.6)] active:scale-95">
              {loading ? <Loader2 size={20} className="animate-spin"/> : <Play size={20} strokeWidth={3}/>}
              {loading ? `Sistem ${preview.length} QR Kod Üretiyor...` : `${preview.length > 0 ? preview.length + " " : ""}QR Kodları Üretmeye Başla`}
            </button>
            {loading && (
              <button type="button" onClick={pauseImport} className={`mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-black transition ${isDark ? "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>
                <PauseCircle size={18}/> İşlemi Duraklat
              </button>
            )}
            {pausedMessage && <div role="status" aria-live="polite" className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold ${isDark ? "border-sky-400/30 bg-sky-500/10 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-800"}`}>{pausedMessage}</div>}
            {unsupportedModeRows.length > 0 && <p id="bulk-submit-mode-help" className="sr-only">Oluşturmadan önce uyumsuz satırları düzeltin veya statik moda geçin.</p>}

            {result && <ResultView result={result} isDark={isDark}/>}
            {result && result.success > 0 && onBack && (
              <button type="button" onClick={onBack} className={`w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-bold transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}><ArrowLeft size={16}/> Dashboard&apos;a Dön</button>
            )}
          </div>
        </div>

        {(history.length > 0 || historyError) && (
          <section className={`rounded-[2.5rem] border ${card} p-6 sm:p-8`} aria-labelledby="bulk-history-title">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 id="bulk-history-title" className={`text-lg font-black ${tx}`}>Son İçe Aktarmalar</h2>
                <p className={`mt-1 text-xs font-medium ${sub}`}>Her dosyanın başarı ve hata sayıları kalıcı olarak saklanır.</p>
              </div>
              <button
                type="button"
                onClick={() => void refreshHistory()}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Yenile
              </button>
            </div>
            {historyError && (
              <div role="alert" className={`mb-4 rounded-xl border px-4 py-3 text-xs font-bold ${isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                {historyError}
              </div>
            )}
            <div className="space-y-2">
              {history.map(item => (
                <div key={item.id} className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-center ${isDark ? "border-white/10 bg-black/10" : "border-slate-200 bg-slate-50/70"}`}>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-black ${tx}`}>{item.name}</p>
                    <p className={`mt-1 text-[11px] ${sub}`}>{new Date(item.created_at).toLocaleString("tr-TR")}</p>
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    item.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                    item.status === "failed" ? "bg-rose-500/10 text-rose-500" :
                    item.status === "partial" ? "bg-amber-500/10 text-amber-500" :
                    "bg-sky-500/10 text-sky-500"
                  }`}>{BULK_STATUS_LABELS[item.status]}</span>
                  <span className="text-xs font-bold text-emerald-500">{item.created_rows} başarılı</span>
                  <span className={`text-xs font-bold ${item.failed_rows ? "text-rose-500" : sub}`}>{item.failed_rows} hatalı</span>
                  {(item.status === "partial" || item.status === "failed") && item.failed_rows > 0 ? (
                    <button
                      type="button"
                      disabled={retryingBatchId !== null || resumingBatchId !== null}
                      onClick={() => void handleRetry(item.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                    >
                      {retryingBatchId === item.id ? <Loader2 size={13} className="animate-spin"/> : <RotateCcw size={13}/>} Yeniden Dene
                    </button>
                  ) : item.status === "ready" || item.status === "processing" ? (
                    <button
                      type="button"
                      disabled={resumingBatchId !== null || retryingBatchId !== null}
                      onClick={() => void handleResume(item.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20" : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"}`}
                    >
                      {resumingBatchId === item.id ? <Loader2 size={13} className="animate-spin"/> : <Play size={13}/>} Devam Et
                    </button>
                  ) : <span aria-hidden="true" />}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

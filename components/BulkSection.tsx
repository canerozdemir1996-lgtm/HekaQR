"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, FileSpreadsheet, X, CheckCircle2,
  AlertCircle, Loader2, Download, Play, Palette, ChevronDown,
  Sun, Moon, FileText, Trash2,
} from "lucide-react";
import { fetchStyles, bulkCreateQrCodes, type QrStyle, type BulkRow, type BulkResult } from "@/lib/supabase";

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text: string): { rows: BulkRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV en az 2 satır olmalı (başlık + veri)"] };

  const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/["']/g, ""));
  const titleIdx = header.findIndex(h => ["title","baslik","başlık","name","ad","isim"].includes(h));
  const urlIdx = header.findIndex(h => ["url","target_url","link","hedef","website"].includes(h));

  if (titleIdx === -1 || urlIdx === -1) {
    return { rows: [], errors: [`Sütunlar bulunamadı. Beklenen: title, url — Bulunan: ${header.join(", ")}`] };
  }

  const rows: BulkRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = [];
    let cur = ""; let inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const title = cols[titleIdx]?.trim();
    const url = cols[urlIdx]?.trim();

    if (!title) { errors.push(`Satır ${i + 1}: Başlık boş`); continue; }
    if (!url) { errors.push(`Satır ${i + 1}: URL boş`); continue; }
    try { new URL(url); } catch { errors.push(`Satır ${i + 1}: Geçersiz URL — "${url}"`); continue; }

    rows.push({ title, target_url: url, is_active: true });
  }
  return { rows, errors };
}

// ── Template Picker ───────────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect, isDark }: {
  templates: QrStyle[]; selected: string | null;
  onSelect: (id: string | null) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sel = templates.find(t => t.id === selected);
  const bdr = isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white";
  const tx = isDark ? "text-slate-200" : "text-slate-800";
  const sub = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border ${bdr} transition-all hover:border-violet-500/50`}>
        <Palette size={15} className={sel ? "text-violet-400" : sub} />
        <span className={`flex-1 text-left text-sm font-semibold ${sel ? (isDark ? "text-violet-300" : "text-violet-700") : sub}`}>
          {sel ? sel.name : "Şablon seçin (opsiyonel)"}
        </span>
        <ChevronDown size={13} className={`${sub} transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-2 left-0 right-0 z-50 border rounded-2xl shadow-2xl overflow-hidden animate-scale-in backdrop-blur-xl ${isDark ? "bg-[#0b1121]/90 border-white/10" : "bg-white/95 border-slate-200/60"}`}>
          <button onClick={() => { onSelect(null); setOpen(false); }}
            className={`flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold border-b transition-colors ${isDark ? "text-slate-400 hover:bg-white/5 border-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-50 border-slate-100 hover:text-slate-800"}`}>
            <X size={12}/> Şablon olmadan
          </button>
          <div className="max-h-52 overflow-y-auto">
            {templates.length === 0 ? (
              <div className={`px-4 py-6 text-sm font-medium ${sub} text-center`}>
                Şablon yok.{" "}
                <Link href="/dashboard/templates" className="text-violet-500 hover:text-violet-400 hover:underline font-bold">Oluştur →</Link>
              </div>
            ) : templates.map(t => (
              <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-bold transition-all ${selected === t.id
                  ? isDark ? "text-violet-300 bg-violet-500/10" : "text-violet-600 bg-violet-50"
                  : isDark ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Palette size={12} className="text-violet-500 shrink-0" />
                <span className="flex-1 text-left truncate">{t.name}</span>
                {selected === t.id && <CheckCircle2 size={12} className="text-violet-400 shrink-0"/>}
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
  return (
    <div className="space-y-4 animate-fade-in mt-6">
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
          <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-3">Hata Detayları:</p>
          {result.failed.map((f, i) => (
            <div key={i} className={`text-sm font-medium ${isDark ? "text-rose-300/80" : "text-rose-700"}`}>
              <span className="font-bold opacity-70 mr-2">Satır {f.row}:</span> {f.title} <span className="opacity-60 text-xs ml-1">({f.error})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function BulkSection({ isDark, onBack }: { isDark: boolean; onBack?: () => void }) {
  const [templates, setTemplates] = useState<QrStyle[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<BulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchStyles().then(setTemplates).catch(() => {}); }, []);

  const handleCSV = useCallback((text: string) => {
    setCsvText(text); setResult(null);
    const { rows, errors } = parseCSV(text);
    setPreview(rows); setParseErrors(errors);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => handleCSV(e.target?.result as string);
    reader.readAsText(file, "utf-8");
  }, [handleCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSubmit = useCallback(async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const r = await bulkCreateQrCodes(preview, selectedTemplate);
      setResult(r);
      if (r.success > 0) { setCsvText(""); setPreview([]); setParseErrors([]); }
    } catch (e) {
      setResult({ success: 0, failed: [{ row: 0, title: "Tüm satırlar", error: e instanceof Error ? e.message : "Hata" }], created: [] });
    } finally { setLoading(false); }
  }, [preview, selectedTemplate]);

  const downloadSample = () => {
    const csv = "title,url\nYaz Kampanyası,https://example.com/yaz-kampanya\nBlog Yazısı,https://blog.example.com/yeni-yazi\nInstagram Profil,https://instagram.com/marka\nÜrün Kataloğu,https://example.com/katalog";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "qrhub-bulk-ornek.csv"; a.click();
  };

  const reset = () => { setCsvText(""); setPreview([]); setParseErrors([]); setResult(null); };

  // Theme
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";
  const card = isDark ? "bg-[#0b1121]/60 border-white/10 shadow-xl shadow-black/10 backdrop-blur-2xl" : "bg-white/80 border-slate-200/60 shadow-xl shadow-slate-200/40 backdrop-blur-2xl";
  const inp = isDark ? "bg-[#020617]/50 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" : "bg-white/50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50";
  const lbl = `text-[10px] font-bold uppercase tracking-widest ${sub}`;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200 transition-colors duration-500 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden`}>
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/10 dark:bg-teal-600/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
      </div>

      <header className="relative z-40 max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className={`flex items-center justify-between gap-4 px-6 py-4 rounded-[2rem] border transition-all duration-300 ${isDark ? "bg-[#0b1121]/60 border-white/10 backdrop-blur-2xl shadow-xl shadow-black/20" : "bg-white/70 border-slate-200/50 backdrop-blur-2xl shadow-xl shadow-slate-200/20"}`}>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={`flex items-center justify-center w-10 h-10 rounded-[1.25rem] transition-all shadow-sm active:scale-95 ${isDark ? "bg-[#020617] border border-white/10 text-slate-400 hover:bg-white/5" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <ArrowLeft size={18}/>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <FileSpreadsheet size={18} className="text-white"/>
              </div>
              <span className="font-black text-lg tracking-tight hidden sm:block">Toplu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Oluşturucu</span></span>
            </div>
          </div>
          <button onClick={downloadSample}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${isDark ? "border-white/10 bg-[#020617] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600"}`}>
            <Download size={16}/> Örnek İndir
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* How it works */}
        <div className={`rounded-[2.5rem] border ${card} p-8 animate-fade-in`}>
          <h2 className={`font-black text-xl ${tx} mb-6 tracking-tight`}>3 Adımda Yüzlerce QR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: "1", t: "CSV Hazırla", d: "Sadece başlık ve link içeren basit bir excel listesi oluştur.", c: "text-violet-500", bg: isDark ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-200" },
              { n: "2", t: "Şablon Seç", d: "Markana uygun renkleri ve logoyu içeren tasarım stilini belirle.", c: "text-emerald-500", bg: isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200" },
              { n: "3", t: "Tek Tıkla Üret", d: "Yükle ve anında yüksek çözünürlüklü yüzlerce QR kod elde et.", c: "text-amber-500", bg: isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200" },
            ].map(s => (
              <div key={s.n} className={`group relative rounded-[1.5rem] border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg overflow-hidden ${s.bg}`}>
                <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-[1rem] ${isDark ? "bg-black/40 shadow-inner" : "bg-white shadow-sm"} text-base font-black flex items-center justify-center ${s.c} mb-4 group-hover:scale-110 transition-transform`}>{s.n}</div>
                  <p className={`text-base font-black ${tx} mb-1.5`}>{s.t}</p>
                  <p className={`text-xs font-medium leading-relaxed ${sub}`}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT */}
          <div className={`space-y-6 rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '100ms' }}>
            {/* Drop zone */}
            <div>
              <p className={`${lbl} mb-2`}>CSV Dosyası</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-[2rem] border-2 border-dashed p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 ${
                  dragOver ? "border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
                  csvText ? isDark ? "border-emerald-500/50 bg-emerald-500/5" : "border-emerald-400 bg-emerald-50" :
                  isDark ? "border-white/10 hover:border-white/20 bg-[#020617]/50 hover:bg-white/5" : "border-slate-300 hover:border-emerald-300 bg-slate-50/50 hover:bg-white"
                }`}>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {csvText ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                      <CheckCircle2 size={32} className="text-emerald-500"/>
                    </div>
                    <p className={`text-lg font-black ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Mükemmel, dosya hazır!</p>
                    <p className={`text-sm font-medium ${sub}`}>{preview.length} satır bulundu {parseErrors.length > 0 ? `· ${parseErrors.length} uyarı` : ""}</p>
                    <button onClick={e => { e.stopPropagation(); reset(); }}
                      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl mt-2 transition-all ${isDark ? "bg-white/5 hover:bg-rose-500/20 hover:text-rose-400" : "bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"}`}><X size={14}/> Dosyayı İptal Et</button>
                  </>
                ) : (
                  <>
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${isDark ? "bg-[#020617] border border-white/10" : "bg-white border border-slate-200"}`}>
                      <Upload size={28} className={isDark ? "text-slate-400" : "text-slate-500"} strokeWidth={2}/>
                    </div>
                    <div className="text-center">
                      <p className={`text-base font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Dosyayı buraya sürükle veya tıkla</p>
                      <p className={`text-xs font-medium ${sub} mt-2`}>.csv veya .txt · Max 5MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className={`rounded-[1.5rem] border p-4 space-y-1.5 shadow-sm ${isDark ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2"><AlertCircle size={14}/> {parseErrors.length} Uyarı</p>
                {parseErrors.slice(0, 5).map((e, i) => <p key={i} className={`text-xs font-medium ${isDark ? "text-amber-200/80" : "text-amber-700"}`}>{e}</p>)}
                {parseErrors.length > 5 && <p className={`text-xs font-bold ${sub}`}>+{parseErrors.length - 5} daha…</p>}
              </div>
            )}

            {/* Template picker */}
            <div>
              <p className={`${lbl} mb-2`}>Tasarım Şablonu</p>
              <TemplatePicker templates={templates} selected={selectedTemplate} onSelect={setSelectedTemplate} isDark={isDark}/>
              {!selectedTemplate && (
                <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 mt-3 px-2">
                  <Palette size={14}/> Yeni şablon stüdyosu →
                </Link>
              )}
            </div>

            {/* Manual paste */}
            <div>
              <p className={`${lbl} mb-2`}>Ya da Direkt Yapıştır</p>
              <textarea
                value={csvText}
                onChange={e => handleCSV(e.target.value)}
                placeholder={"title,url\nÜrün Sayfası,https://example.com/urun\nBlog,https://example.com/blog"}
                rows={6}
                className={`w-full border rounded-[1.5rem] px-5 py-4 text-xs font-mono outline-none resize-none transition-all shadow-inner ${inp}`}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className={`space-y-6 rounded-[2.5rem] border ${card} p-6 sm:p-8 animate-fade-in`} style={{ animationDelay: '200ms' }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className={lbl}>Önizleme {preview.length > 0 && <span className={`normal-case font-normal ${sub}`}>({preview.length} QR oluşturulacak)</span>}</p>
                {preview.length > 0 && (
                  <button onClick={reset} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${isDark ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}><Trash2 size={12}/> Listeyi Sil</button>
                )}
              </div>
              <div className={`rounded-[1.5rem] border overflow-hidden ${isDark ? "border-white/10 bg-[#020617]/50" : "border-slate-200 bg-white"}`}>
                {preview.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                      <FileText size={28} className={isDark ? "text-slate-600" : "text-slate-300"}/>
                    </div>
                    <p className={`text-sm font-medium ${sub}`}>CSV yüklendiğinde liste burada belirecek.</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-2 px-5 py-3 border-b shadow-sm ${isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100"}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Başlık</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>URL</span>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                      {preview.map((row, i) => (
                        <div key={i} className={`grid grid-cols-2 gap-4 px-5 py-3.5 transition-colors ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"}`}>
                          <p className={`text-sm ${tx} truncate font-bold`}>{row.title}</p>
                          <p className={`text-xs font-mono truncate ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{row.target_url}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Summary */}
            {preview.length > 0 && (
              <div className={`rounded-[1.5rem] border p-5 space-y-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"}`}>
                {[
                  { k: "Oluşturulacak QR", v: preview.length.toString(), bold: true },
                  { k: "Tasarım Şablonu", v: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name ?? "Seçili" : "Yok (varsayılan)" },
                  { k: "Geçerli Satır", v: `${preview.length}` },
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
            <button onClick={handleSubmit} disabled={preview.length === 0 || loading}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-base font-black text-white transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(16,185,129,0.6)] active:scale-95">
              {loading ? <Loader2 size={20} className="animate-spin"/> : <Play size={20} strokeWidth={3}/>}
              {loading ? `Sistem ${preview.length} QR Kod Üretiyor...` : `${preview.length > 0 ? preview.length + " " : ""}QR Kodları Üretmeye Başla`}
            </button>

            {result && <ResultView result={result} isDark={isDark}/>}
            {result && result.success > 0 && (
              <button onClick={onBack} className={`w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-bold transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}><ArrowLeft size={16}/> Dashboard&apos;a Dön</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

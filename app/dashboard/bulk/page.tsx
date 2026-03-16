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
        <span className={`flex-1 text-left text-sm ${sel ? "text-violet-300 font-semibold" : sub}`}>
          {sel ? sel.name : "Şablon seçin (opsiyonel)"}
        </span>
        <ChevronDown size={13} className={`${sub} transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1.5 left-0 right-0 z-20 border rounded-xl shadow-2xl overflow-hidden animate-scalein ${isDark ? "bg-[#0f1525] border-white/10" : "bg-white border-slate-200"}`}>
          <button onClick={() => { onSelect(null); setOpen(false); }}
            className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm border-b transition-colors ${isDark ? "text-slate-500 hover:bg-white/5 border-white/5" : "text-slate-400 hover:bg-slate-50 border-slate-100"}`}>
            <X size={12}/> Şablon olmadan
          </button>
          <div className="max-h-52 overflow-y-auto">
            {templates.length === 0 ? (
              <div className={`px-4 py-4 text-xs ${sub} text-center`}>
                Şablon yok.{" "}
                <Link href="/dashboard/templates" className="text-violet-400 hover:underline">Oluştur →</Link>
              </div>
            ) : templates.map(t => (
              <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${selected === t.id
                  ? isDark ? "text-violet-300 bg-violet-500/10" : "text-violet-600 bg-violet-50"
                  : isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}>
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
    <div className="space-y-3 animate-fadeup">
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${isDark ? "border-emerald-800/50 bg-emerald-900/20" : "border-emerald-200 bg-emerald-50"}`}>
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className={`text-2xl font-black ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{result.success}</p>
            <p className={`text-xs ${isDark ? "text-emerald-600" : "text-emerald-500"}`}>başarıyla oluşturuldu</p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${result.failed.length > 0
          ? isDark ? "border-red-800/50 bg-red-900/20" : "border-red-200 bg-red-50"
          : isDark ? "border-white/8 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
          <AlertCircle size={20} className={result.failed.length > 0 ? "text-red-400 shrink-0" : `${isDark ? "text-slate-600" : "text-slate-400"} shrink-0`} />
          <div>
            <p className={`text-2xl font-black ${result.failed.length > 0 ? "text-red-400" : isDark ? "text-slate-600" : "text-slate-400"}`}>{result.failed.length}</p>
            <p className={`text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>başarısız</p>
          </div>
        </div>
      </div>
      {result.failed.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-1.5 ${isDark ? "border-red-800/30 bg-red-900/10" : "border-red-200 bg-red-50"}`}>
          <p className="text-xs font-semibold text-red-400 mb-2">Başarısız Satırlar:</p>
          {result.failed.map((f, i) => (
            <div key={i} className={`text-xs ${isDark ? "text-red-300/80" : "text-red-600"}`}>
              <span className="font-medium">Satır {f.row}</span> — <strong>{f.title}</strong>: {f.error}
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
  const bg = isDark ? "bg-[#07090f] text-slate-100" : "bg-slate-50 text-slate-900";
  const nav = isDark ? "glass-dark border-white/[0.07]" : "glass-light border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";
  const card = isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-slate-200 shadow-sm";
  const inp = isDark ? "bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-violet-500" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400";
  const lbl = `text-[10px] font-bold uppercase tracking-widest ${sub}`;

  return (
    <div className={`min-h-screen ${bg}`}>
      <header className={`sticky top-0 z-20 border-b ${nav} px-5 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft size={13}/> Dashboard</button>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={15} className="text-emerald-400"/>
            <span className="font-black text-sm tracking-tight">Toplu <span className="text-emerald-400">QR Yükleme</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadSample}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${isDark ? "border-white/8 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400" : "border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600"}`}>
            <Download size={12}/> Örnek CSV
          </button>
          <button style={{display:"none"}} onClick={() => {}}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/8 text-yellow-400/60 hover:text-yellow-300" : "border-slate-200 text-slate-500"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* How it works */}
        <div className={`rounded-2xl border ${card} p-5`}>
          <h2 className={`font-bold text-sm ${tx} mb-4`}>Nasıl Çalışır?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n: "1", t: "CSV Hazırla", d: "title ve url sütunları içeren bir CSV dosyası oluşturun ya da örnek şablonu indirin.", c: "text-violet-400", bg: isDark ? "bg-violet-900/20 border-violet-800/40" : "bg-violet-50 border-violet-200" },
              { n: "2", t: "Şablon Seç", d: "Tüm QR'lara uygulanacak tasarım şablonunu seçin. Şablon Studio'dan önceden oluşturun.", c: "text-emerald-400", bg: isDark ? "bg-emerald-900/20 border-emerald-800/40" : "bg-emerald-50 border-emerald-200" },
              { n: "3", t: "Oluştur", d: "CSV'yi yükleyin, önizleyin ve tek tıkla onlarca QR kodu birden oluşturun.", c: "text-amber-400", bg: isDark ? "bg-amber-900/20 border-amber-800/40" : "bg-amber-50 border-amber-200" },
            ].map(s => (
              <div key={s.n} className={`rounded-xl border p-4 ${s.bg}`}>
                <div className={`w-6 h-6 rounded-full ${isDark ? "bg-black/30" : "bg-white"} border border-white/10 text-xs font-black flex items-center justify-center ${s.c} mb-3`}>{s.n}</div>
                <p className={`text-sm font-bold ${tx} mb-1`}>{s.t}</p>
                <p className={`text-xs leading-relaxed ${sub}`}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-4">
            {/* Drop zone */}
            <div>
              <p className={`${lbl} mb-2`}>CSV Dosyası</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragOver ? "border-emerald-500 bg-emerald-500/10" :
                  csvText ? isDark ? "border-emerald-700/60 bg-emerald-900/10" : "border-emerald-400 bg-emerald-50" :
                  isDark ? "border-white/10 hover:border-white/20 bg-white/[0.02]" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {csvText ? (
                  <>
                    <CheckCircle2 size={28} className="text-emerald-400"/>
                    <p className={`text-sm font-semibold ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>CSV yüklendi</p>
                    <p className={`text-xs ${sub}`}>{preview.length} geçerli satır {parseErrors.length > 0 ? `· ${parseErrors.length} uyarı` : ""}</p>
                    <button onClick={e => { e.stopPropagation(); reset(); }}
                      className={`flex items-center gap-1 text-xs ${sub} hover:text-red-400 mt-1`}><X size={11}/> Temizle</button>
                  </>
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-slate-200"}`}>
                      <Upload size={20} className={sub}/>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>CSV dosyasını sürükle ya da tıkla</p>
                      <p className={`text-xs ${sub} mt-1`}>Desteklenen: .csv, .txt · Kodlama: UTF-8</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className={`rounded-xl border p-3 space-y-1 ${isDark ? "border-amber-800/40 bg-amber-900/10" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-xs font-bold text-amber-400 mb-1.5">⚠ {parseErrors.length} Uyarı</p>
                {parseErrors.slice(0, 5).map((e, i) => <p key={i} className={`text-xs ${isDark ? "text-amber-300/80" : "text-amber-600"}`}>{e}</p>)}
                {parseErrors.length > 5 && <p className={`text-xs ${sub}`}>+{parseErrors.length - 5} daha…</p>}
              </div>
            )}

            {/* Template picker */}
            <div>
              <p className={`${lbl} mb-2`}>Tasarım Şablonu</p>
              <TemplatePicker templates={templates} selected={selectedTemplate} onSelect={setSelectedTemplate} isDark={isDark}/>
              {!selectedTemplate && (
                <Link href="/dashboard/templates" className="flex items-center gap-1 text-xs text-violet-400 hover:underline mt-2">
                  <Palette size={11}/> Yeni şablon oluştur →
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
                className={`w-full border rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none transition-all ${inp}`}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={lbl}>Önizleme {preview.length > 0 && <span className={`normal-case font-normal ${sub}`}>({preview.length} QR oluşturulacak)</span>}</p>
                {preview.length > 0 && (
                  <button onClick={reset} className={`flex items-center gap-1 text-xs ${sub} hover:text-red-400`}><Trash2 size={10}/> Temizle</button>
                )}
              </div>
              <div className={`rounded-2xl border overflow-hidden ${card}`}>
                {preview.length === 0 ? (
                  <div className="flex flex-col items-center py-14 gap-2">
                    <FileText size={28} className={sub}/>
                    <p className={`text-xs ${sub}`}>CSV yüklenince önizleme görünür</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-2 px-4 py-2.5 border-b ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-100"}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Başlık</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>URL</span>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                      {preview.map((row, i) => (
                        <div key={i} className={`grid grid-cols-2 gap-2 px-4 py-2.5 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}>
                          <p className={`text-xs ${tx} truncate font-medium`}>{row.title}</p>
                          <p className="text-xs text-violet-400 truncate">{row.target_url}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Summary */}
            {preview.length > 0 && (
              <div className={`rounded-xl border p-4 space-y-2 ${isDark ? "bg-white/[0.02] border-white/[0.07]" : "bg-slate-50 border-slate-200"}`}>
                {[
                  { k: "Oluşturulacak QR", v: preview.length.toString(), bold: true },
                  { k: "Tasarım Şablonu", v: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name ?? "Seçili" : "Yok (varsayılan)" },
                  { k: "Geçerli Satır", v: `${preview.length}` },
                  parseErrors.length > 0 ? { k: "Uyarı", v: `${parseErrors.length} satır atlanacak`, warn: true } : null,
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} className="flex justify-between text-xs">
                    <span className={sub}>{row.k}</span>
                    <span className={row.warn ? "text-amber-400" : row.bold ? `font-bold ${tx}` : isDark ? "text-slate-300" : "text-slate-600"}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={preview.length === 0 || loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-all shadow-lg shadow-emerald-900/30">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Play size={16}/>}
              {loading ? `${preview.length} QR oluşturuluyor…` : `${preview.length > 0 ? preview.length + " " : ""}QR Kodlarını Oluştur`}
            </button>

            {result && <ResultView result={result} isDark={isDark}/>}
            {result && result.success > 0 && (
              <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft size={13}/> Dashboard</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AlertCircle, ArrowLeft, Search, CheckSquare, Square, X, FileSpreadsheet, Loader2, Save, RotateCcw, Filter, Upload, Download } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import { fetchQrCodes, type QrCode as QrCodeType } from "@/lib/supabase";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

type SelectedItem = {
  qr: QrCodeType;
  adt: number;
};

type BartenderRow = { SKU: string; "ÜRÜN ADI": string; "QR DOSYA ADI": string; ADT: number };

const STORAGE_KEY = "bartender_selections";

async function exportBartenderSheet(rows: BartenderRow[]) {
  await writeXlsxFile([
    ["SKU", "ÜRÜN ADI", "QR DOSYA ADI", "ADT"],
    ...rows.map(row => [row.SKU, row["ÜRÜN ADI"], row["QR DOSYA ADI"], row.ADT]),
  ], { sheet: "BARTENDER" }).toFile(`bartender-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function saveSelections(selected: Map<string, SelectedItem>) {
  try {
    const data = Array.from(selected.entries()).map(([id, item]) => ({ id, adt: item.adt }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Save error:", e);
  }
}

function loadSelections(): { id: string; adt: number }[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Load error:", e);
    return [];
  }
}

async function parseExcelImport(file: File, qrMap: Map<string, QrCodeType>): Promise<{ id: string; adt: number }[]> {
  const table = await readSheet(file);
  if (table.length < 2) throw new Error("Excel sayfasında veri bulunamadı");

  const headers = table[0].map(value => String(value ?? "").trim().toLocaleLowerCase("tr-TR"));
  const findColumn = (...aliases: string[]) => headers.findIndex(header => aliases.includes(header));
  const skuColumn = findColumn("sku", "slug", "short_slug");
  const quantityColumn = findColumn("adt");
  if (skuColumn < 0) throw new Error("SKU veya Slug sütunu bulunamadı");

  const results: { id: string; adt: number }[] = [];
  for (const row of table.slice(1)) {
    const sku = String(row[skuColumn] ?? "").trim();
    const adt = Number.parseInt(String(row[quantityColumn] ?? "1"), 10) || 1;
    if (!sku) continue;

    const qr = Array.from(qrMap.values()).find(candidate => (
      candidate.short_slug === sku
      || candidate.notes?.trim() === sku
      || candidate.tags?.some((tag: string) => tag === sku)
    ));
    if (qr) results.push({ id: qr.id, adt: Math.max(1, adt) });
  }
  return results;
}

export default function BartenderPage() {
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map());
  const [globalAdt, setGlobalAdt] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [draggedItem, setDraggedItem] = useState<QrCodeType | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await fetchQrCodes();
        setQrs(list);

        // Load saved selections
        const saved = loadSelections();
        const qrMap = new Map(list.map(q => [q.id, q]));
        const restored = new Map<string, SelectedItem>();
        
        for (const { id, adt } of saved) {
          const qr = qrMap.get(id);
          if (qr) restored.set(id, { qr, adt });
        }
        
        if (restored.size > 0) setSelected(restored);
      } catch (e) {
        setError(e instanceof Error ? e.message : "QR kodları yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = qrs;

    // Search filter
    if (term) {
      result = result.filter(q =>
        q.title?.toLowerCase().includes(term) || 
        q.short_slug?.toLowerCase().includes(term) || 
        (q.notes ?? "").toLowerCase().includes(term) ||
        (q.tags ?? []).some((tag: string) => tag.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filterStatus === "active") {
      result = result.filter(q => q.is_active);
    } else if (filterStatus === "inactive") {
      result = result.filter(q => !q.is_active);
    }

    return result;
  }, [qrs, search, filterStatus]);

  const selectedItems = useMemo(() => Array.from(selected.values()), [selected]);
  const totalAdt = useMemo(() => selectedItems.reduce((sum, i) => sum + i.adt, 0), [selectedItems]);

  const toggleSelect = useCallback((qr: QrCodeType) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(qr.id)) {
        next.delete(qr.id);
      } else {
        next.set(qr.id, { qr, adt: globalAdt || 1 });
      }
      saveSelections(next);
      return next;
    });
  }, [globalAdt]);

  const updateAdt = useCallback((id: string, adt: number) => {
    setSelected(prev => {
      const next = new Map(prev);
      const item = next.get(id);
      if (!item) return prev;
      next.set(id, { ...item, adt: Math.max(1, adt) });
      saveSelections(next);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => {
    setSelected(new Map());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Clear error:", e);
    }
  }, []);

  const handleDragStart = (qr: QrCodeType) => {
    setDraggedItem(qr);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add("ring-2", "ring-violet-500");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (dropZoneRef.current && e.currentTarget === dropZoneRef.current) {
      dropZoneRef.current.classList.remove("ring-2", "ring-violet-500");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove("ring-2", "ring-violet-500");
    }
    if (draggedItem) {
      toggleSelect(draggedItem);
      setDraggedItem(null);
    }
  };

  const handleExcelImport = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const qrMap = new Map(qrs.map(q => [q.id, q]));
      const results = await parseExcelImport(file, qrMap);
      
      if (results.length === 0) {
        alert("Excel dosyasında eşleşen QR bulunamadı. SKU/Slug ve ADT sütunlarını kontrol edin.");
        return;
      }

      const next = new Map(selected);
      for (const { id, adt } of results) {
        const qr = qrMap.get(id);
        if (qr) {
          next.set(id, { qr, adt });
        }
      }
      setSelected(next);
      saveSelections(next);
      alert(`${results.length} QR başarıyla yüklendi.`);
    } catch (e) {
      alert(`Excel import hatası: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    } finally {
      setImporting(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }, [qrs, selected]);

  const downloadTemplate = async () => {
    const template: BartenderRow[] = [
      {
        SKU: "ornek-1",
        "ÜRÜN ADI": "Örnek QR 1",
        "QR DOSYA ADI": "https://example.com/api/v1/qrcodes/render?slug=ornek-1&format=png&size=600",
        ADT: 10,
      },
      {
        SKU: "ornek-2",
        "ÜRÜN ADI": "Örnek QR 2",
        "QR DOSYA ADI": "https://example.com/api/v1/qrcodes/render?slug=ornek-2&format=png&size=600",
        ADT: 5,
      },
    ];
    await writeXlsxFile([
      ["SKU", "ÜRÜN ADI", "QR DOSYA ADI", "ADT"],
      ...template.map(row => [row.SKU, row["ÜRÜN ADI"], row["QR DOSYA ADI"], row.ADT]),
    ], { sheet: "Template" }).toFile("bartender-template.xlsx");
  };

  const doExport = useCallback(async () => {
    if (selectedItems.length === 0) {
      alert("Lütfen en az bir QR seçin.");
      return;
    }

    setExporting(true);
    try {
      const origin = getPublicAppOrigin(window.location.origin);
      const rows: BartenderRow[] = selectedItems.map(item => ({
        SKU: item.qr.notes?.trim() || item.qr.tags?.[0]?.trim() || item.qr.short_slug || item.qr.id,
        "ÜRÜN ADI": item.qr.title || "QR",
        "QR DOSYA ADI": `${origin}/api/v1/qrcodes/render?slug=${encodeURIComponent(item.qr.short_slug)}&format=png&size=600`,
        ADT: item.adt,
      }));
      await exportBartenderSheet(rows);
      alert(`${rows.length} kayıt BarTender formatında indirildi.`);
    } catch (e) {
      alert(`BarTender export hatası: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    } finally {
      setExporting(false);
    }
  }, [selectedItems]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <input ref={uploadInputRef} type="file" accept=".xlsx" onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        if (file) handleExcelImport(file);
      }} className="hidden" />

      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black">BarTender Seçim Paneli</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sağ taraftan QR seç, ortadaki alana taşı ve toplu BarTender çıktı al.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void downloadTemplate()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Download size={14}/> Template
          </button>
          <button onClick={() => uploadInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition disabled:opacity-50">
            <Upload size={14}/> {importing ? "Yükleniyor..." : "Excel Yükle"}
          </button>
          <Link href="/dashboard" className="text-sm text-violet-600 dark:text-violet-300 hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Center: selected items */}
        <section className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seçilen QR&apos;lar</h2>
            <div className="flex items-center gap-2">
              <button onClick={doExport} disabled={selectedItems.length === 0 || exporting}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-40">
                {exporting ? <Loader2 size={12} className="animate-spin"/> : <FileSpreadsheet size={12}/>} Export
              </button>
              <button onClick={() => saveSelections(selected)} disabled={selectedItems.length === 0}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40">
                <Save size={12}/> Kaydet
              </button>
              <button onClick={clearSelected} disabled={selectedItems.length === 0}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40">
                <RotateCcw size={12}/> Temizle
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-500 dark:text-slate-400">Seçim: {selectedItems.length} adet</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Toplam ADT: {totalAdt}</span>
            <label className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              Varsayılan ADT
              <input type="number" min={1} value={globalAdt} onChange={e => setGlobalAdt(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-sm border rounded-lg px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
            </label>
          </div>

          {selectedItems.length === 0 ? (
            <div ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400 transition">
              QR seçmek için sağdaki listeden kutucuğu işaretleyin veya sürükle-bırak yapın.
            </div>
          ) : (
            <div ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="space-y-2">
              {selectedItems.map((item) => (
                <div key={item.qr.id} className="border rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition group">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{item.qr.title || "(Başlıksız)"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.qr.short_slug}</p>
                    {item.qr.tags && item.qr.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(item.qr.tags as string[]).slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-600 dark:text-violet-300">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400">ADT</label>
                    <input type="number" min={1} value={item.adt}
                      onChange={e => updateAdt(item.qr.id, Math.max(1, Number(e.target.value) || 1))}
                      className="w-18 text-xs border rounded-lg px-2 py-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
                    <button onClick={() => toggleSelect(item.qr)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                      <X size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: QR list */}
        <aside className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm flex flex-col max-h-[calc(100vh-200px)]">
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input
                placeholder="QR arama..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none">
                <option value="all">Tüm QR&apos;lar</option>
                <option value="active">Sadece Aktif</option>
                <option value="inactive">Sadece Pasif</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Yükleniyor...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-red-500">
              <AlertCircle size={16} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Search size={20} className="text-slate-400" />
              Aradığınız kriterlerle QR bulunamadı.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {filtered.map(qr => {
                const isChecked = selected.has(qr.id);
                const isAdmin = true; // Assuming they can see status
                return (
                  <button key={qr.id} type="button" 
                    draggable
                    onDragStart={() => handleDragStart(qr)}
                    onClick={() => toggleSelect(qr)}
                    className={`w-full text-left p-2 rounded-lg border transition cursor-move ${
                      isChecked 
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20" 
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">{isChecked ? <CheckSquare size={16}/> : <Square size={16}/>}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{qr.title || qr.short_slug}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">/q/{qr.short_slug}</p>
                        {!qr.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-300 inline-block mt-1">Pasif</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t pt-3">
            <div>Toplam QR: {qrs.length}</div>
            <div>Gösterilen: {filtered.length}</div>
          </div>
        </aside>
      </main>
    </div>
  );
}

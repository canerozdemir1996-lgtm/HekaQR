"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowLeft, Save, Trash2, Check, Plus, Loader2,
  X, Star, Download, RefreshCw, Sun, Moon,
  Circle, Square, LayoutTemplate, Palette, Sliders,
  Image as ImageIcon, Eye, ChevronRight, Sparkles, ZoomIn, Pencil,
} from "lucide-react";
import {
  createStyleCollection,
  deleteStyle,
  fetchStyleCollections,
  fetchStyles,
  saveStyle,
  type QrStyle,
  type QrTemplateCollection,
} from "@/lib/supabase";
import { createLogoMask } from "@/lib/logoMask";
import { QR_STYLE_PRESETS, type QrStylePreset } from "@/lib/qr-style-presets";

type DotType      = "square" | "rounded" | "extra-rounded" | "dots" | "classy" | "classy-rounded";
type EyeFrameType = "square" | "extra-rounded" | "dot";
type EyeDotType   = "square" | "dot";
type LogoShape    = "circle" | "square" | "rounded";
type Panel        = "dots" | "eyes" | "colors" | "logo" | "advanced";

interface Cfg {
  dotType:           DotType;
  dotColor:          string;
  useGradient:       boolean;
  gradientType:      "linear" | "radial";
  gradientAngle:     number;
  color1:            string;
  color2:            string;
  eyeFrameType:      EyeFrameType;
  eyeDotType:        EyeDotType;
  eyeColor:          string;
  useCustomEyeColor: boolean;
  bgColor:           string;
  bgTransparent:     boolean;
  margin:            number;
  ecLevel:           "L" | "M" | "Q" | "H";
  logoShape:         LogoShape;
  logoSize:          number;
  previewUrl:        string;
}

const DEFAULT: Cfg = {
  dotType:"rounded", dotColor:"#0f172a",
  useGradient:false, gradientType:"linear", gradientAngle:135,
  color1:"#6366f1", color2:"#ec4899",
  eyeFrameType:"extra-rounded", eyeDotType:"dot",
  eyeColor:"#0f172a", useCustomEyeColor:false,
  bgColor:"#ffffff", bgTransparent:false,
  margin:16, ecLevel:"Q",
  logoShape:"circle", logoSize:0.30,
  previewUrl:"https://qrhub.app",
};

function buildOpts(c: Cfg, logo: string | null, size = 300) {
  const eyeColor = c.useCustomEyeColor ? c.eyeColor : (c.useGradient ? c.color1 : c.dotColor);
  return {
    width: size, height: size,
    data: c.previewUrl || "https://qrhub.app",
    margin: c.margin,
    qrOptions: { errorCorrectionLevel: c.ecLevel },
    image: logo ?? undefined,
    imageOptions: { hideBackgroundDots: true, imageSize: logo ? c.logoSize : 0.4, margin: 4 },
    dotsOptions: c.useGradient
      ? { type: c.dotType, gradient: { type: c.gradientType, rotation: (c.gradientAngle * Math.PI) / 180,
            colorStops: [{ offset: 0, color: c.color1 }, { offset: 1, color: c.color2 }] } }
      : { type: c.dotType, color: c.dotColor },
    cornersSquareOptions: { type: c.eyeFrameType, color: eyeColor },
    cornersDotOptions:    { type: c.eyeDotType,   color: eyeColor },
    backgroundOptions: c.bgTransparent ? undefined : { color: c.bgColor },
  };
}

function LiveQR({ cfg, logo, size = 220 }: { cfg: Cfg; logo: string | null; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<unknown>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const opts = buildOpts(cfg, logo, size);
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (!containerRef.current) return;
      if (!qrRef.current) {
        containerRef.current.innerHTML = "";
        const qr = new QRCodeStyling(opts as unknown as never);
        qr.append(containerRef.current);
        qrRef.current = qr;
      } else {
        (qrRef.current as { update: (o: unknown) => void }).update(opts);
      }
    });
  }, [cfg, logo, size]);
  useEffect(() => { return () => { qrRef.current = null; }; }, []);
  return <div ref={containerRef} style={{ width: size, height: size }} />;
}

function MiniQR({ config, size = 68 }: { config: Partial<Cfg>; size?: number }) {
  const cfg = { ...DEFAULT, ...config };
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!divRef.current) return;
    let cancelled = false;
    divRef.current.innerHTML = "";
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !divRef.current) return;
      const qr = new QRCodeStyling(buildOpts(cfg, null, size) as unknown as never);
      qr.append(divRef.current);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, JSON.stringify(config)]);
  return <div ref={divRef} style={{ width: size, height: size }} />;
}

export function TemplatesSection({
  isDark,
  onBack,
  onToggleTheme,
}: {
  isDark: boolean;
  onBack?: () => void;
  onToggleTheme?: () => void;
}) {
  const [cfg, setCfg]                   = useState<Cfg>(DEFAULT);
  const [templates, setTemplates]       = useState<QrStyle[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [loadingTpl, setLoadingTpl]     = useState(true);
  const [saveName, setSaveName]         = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [logo, setLogo]                 = useState<File | null>(null);
  const [logoData, setLogoData]         = useState<string | null>(null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [logoLoading, setLogoLoading]   = useState(false);
  const [activePanel, setActivePanel]   = useState<Panel>("dots");
  const [previewZoom, setPreviewZoom]   = useState(false);
  const [collections, setCollections]   = useState<QrTemplateCollection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [templatePage, setTemplatePage] = useState(1);

  const p = useCallback(<K extends keyof Cfg>(k: K, v: Cfg[K]) =>
    setCfg(prev => ({ ...prev, [k]: v })), []);

  const load = useCallback(async () => {
    setLoadingTpl(true);
    try {
      const [styles, ownedCollections] = await Promise.all([fetchStyles(), fetchStyleCollections()]);
      setTemplates(styles);
      setCollections(ownedCollections);
    } finally { setLoadingTpl(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadTemplate = (style: QrStyle) => {
    const editable = !style.visibility || style.visibility === "private";
    setSelectedId(style.id); setEditingId(editable ? style.id : null);
    setSaveName(editable ? style.name : `${style.name} kopyası`);
    setCollectionId(style.collection_id ?? "");
    const c = style.config as Partial<Cfg> & { savedLogoData?: string };
    setCfg({ ...DEFAULT, ...c });
    // Kaydedilmiş logo varsa geri yükle
    if (c.savedLogoData) {
      setLogoData(c.savedLogoData);
      setLogoPreview(c.savedLogoData);
    } else {
      setLogo(null); setLogoData(null); setLogoPreview(null);
    }
  };

  const loadPreset = (preset: QrStylePreset) => {
    setSelectedId(`preset:${preset.id}`);
    setEditingId(null);
    setSaveName("");
    setCollectionId("");
    setCfg({ ...DEFAULT, ...(preset.config as Partial<Cfg>) });
    setLogo(null); setLogoData(null); setLogoPreview(null);
  };

  const resetToNew = () => {
    setSelectedId(null); setEditingId(null);
    setSaveName(""); setCfg(DEFAULT);
    setCollectionId(""); setSaveError("");
    setLogo(null); setLogoData(null); setLogoPreview(null);
  };

  const applyLogo = useCallback(async (file: File, shape: LogoShape, size: number) => {
    setLogoLoading(true);
    try {
      const masked = await createLogoMask({ source: file, canvasSize: 400, logoRatio: size * 2, shadowBlur: 8, shape });
      setLogoData(masked);
    } catch { setLogoData(null); }
    finally { setLogoLoading(false); }
  }, []);

  const handleLogoFile = async (file: File) => {
    setLogo(file); setLogoPreview(URL.createObjectURL(file));
    await applyLogo(file, cfg.logoShape, cfg.logoSize);
  };
  const handleShapeChange = async (shape: LogoShape) => {
    p("logoShape", shape);
    if (logo) await applyLogo(logo, shape, cfg.logoSize);
  };
  const handleSizeChange = async (size: number) => {
    p("logoSize", size);
    if (logo) await applyLogo(logo, cfg.logoShape, size);
  };

  const save = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      // logoData'yı config içine göm - böylece DB'ye kaydedilir
      const configToSave: Record<string, unknown> = {
        ...(cfg as unknown as Record<string, unknown>),
        ...(logoData ? { savedLogoData: logoData } : {}),
      };
      const style = await saveStyle(saveName.trim(), configToSave, editingId ?? undefined, {
        category: "custom",
        collection_id: collectionId || null,
      });
      setTemplates(prev => editingId ? prev.map(t => t.id === editingId ? style : t) : [style, ...prev]);
      setSelectedId(style.id); setEditingId(style.id); setShowSaveModal(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Şablon kaydedilemedi.");
    } finally { setSaving(false); }
  };

  const addCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    setCollectionSaving(true);
    setSaveError("");
    try {
      const collection = await createStyleCollection(name);
      await load();
      setCollectionId(collection.id);
      setNewCollectionName("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Koleksiyon kaydedilemedi.");
    } finally {
      setCollectionSaving(false);
    }
  };

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const style of templates) {
      if (!style.collection_id) continue;
      counts.set(style.collection_id, (counts.get(style.collection_id) ?? 0) + 1);
    }
    return counts;
  }, [templates]);

  const ownedTemplates = templates.filter(style => !style.visibility || style.visibility === "private");
  const sharedTemplates = templates.filter(style => style.visibility === "system" || style.visibility === "public");
  const visibleTemplates = ownedTemplates.filter(style => !collectionId || style.collection_id === collectionId);
  const pageSize = 12;
  const templatePageCount = Math.max(1, Math.ceil(visibleTemplates.length / pageSize));
  const pagedTemplates = visibleTemplates.slice((templatePage - 1) * pageSize, templatePage * pageSize);

  useEffect(() => {
    setTemplatePage(1);
  }, [collectionId, templates.length]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şablonu sil?")) return;
    await deleteStyle(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) resetToNew();
  };

  const exportPng = async () => {
    const { default: Q } = await import("qr-code-styling");
    await (new Q(buildOpts(cfg, logoData) as unknown as never) as unknown as { download:(o:object)=>Promise<void> }).download({ name:"qrhub-template", extension:"png" });
  };
  const exportSvg = async () => {
    const { default: Q } = await import("qr-code-styling");
    await (new Q(buildOpts(cfg, logoData, 3000) as unknown as never) as unknown as { download:(o:object)=>Promise<void> }).download({ name:"qrhub-template", extension:"svg" });
  };
  const exportPdf = async () => {
    const [{ default: Q }, { PDFDocument }] = await Promise.all([import("qr-code-styling"), import("pdf-lib")]);
    const qr = new Q(buildOpts(cfg, logoData, 1000) as unknown as never) as unknown as { getRawData: (ext: string) => Promise<Blob | Buffer | null> };
    const raw = await qr.getRawData("png");
    if (!raw) return;
    const pngBytes = raw instanceof Blob ? new Uint8Array(await raw.arrayBuffer()) : new Uint8Array(raw);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([420, 480]);
    const image = await pdfDoc.embedPng(pngBytes);
    const size = 320;
    page.drawImage(image, { x: (420 - size) / 2, y: (480 - size) / 2, width: size, height: size });
    const bytes = await pdfDoc.save();

    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qrhub-template.pdf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  // Theme tokens
  const dk = isDark;
  const tx    = dk ? "text-slate-100"    : "text-slate-900";
  const sub   = dk ? "text-slate-500"    : "text-slate-400";
  const pnl   = dk ? "bg-[#0b1121]/60 border-white/10 backdrop-blur-2xl" : "bg-white/80 border-slate-200/60 backdrop-blur-2xl";
  const inp   = dk ? "bg-[#020617]/50 border-white/10 text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" : "bg-white/50 border-slate-200 text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50";

  const Toggle = ({ on, onChange }: { on:boolean; onChange:()=>void }) => (
    <button type="button" onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shadow-inner ${on ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-[0_0_10px_rgba(124,58,237,0.3)]" : dk ? "bg-white/10" : "bg-slate-200"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${on?"translate-x-5":""}`}/>
    </button>
  );

  const ColorPicker = ({ label, val, onChange }: { label:string; val:string; onChange:(v:string)=>void }) => (
    <label className="block space-y-1.5">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{label}</span>
      <span className="compact-color-field">
        <input type="color" value={val} onChange={e=>onChange(e.target.value)} aria-label={`${label} seç`} />
        <input type="text" value={val} onChange={e=>onChange(e.target.value)}
          className={`min-w-0 flex-1 bg-transparent text-xs font-mono font-bold uppercase outline-none ${dk?"text-slate-300":"text-slate-700"}`}/>
      </span>
    </label>
  );

  const panels: { id:Panel; label:string; icon:React.ReactNode }[] = [
    { id:"dots",     label:"Noktalar",  icon:<Sparkles size={13}/> },
    { id:"eyes",     label:"Gözler",    icon:<Eye size={13}/> },
    { id:"colors",   label:"Renkler",   icon:<Palette size={13}/> },
    { id:"logo",     label:"Logo",      icon:<ImageIcon size={13}/> },
    { id:"advanced", label:"Gelişmiş",  icon:<Sliders size={13}/> },
  ];

  return (
    <div className={`min-h-full lg:h-[100dvh] lg:min-h-[640px] ${tx} flex flex-col relative overflow-hidden bg-slate-50 dark:bg-[#020617] transition-colors duration-500`}>
      
      {/* Ambient Premium Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Floating Header */}
      <header className={`relative z-30 mx-4 mt-4 mb-2 px-4 py-3 sm:mt-6 sm:px-6 sm:py-4 rounded-[2rem] border transition-all duration-300 ${dk ? "bg-[#0b1121]/60 border-white/10 backdrop-blur-2xl shadow-xl shadow-black/20" : "bg-white/70 border-slate-200/50 backdrop-blur-2xl shadow-xl shadow-slate-200/20"} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} title="Geri" aria-label="Geri" className={`flex items-center justify-center w-10 h-10 rounded-[1.25rem] transition-all shadow-sm active:scale-95 ${dk ? "bg-[#020617] border border-white/10 text-slate-400 hover:bg-white/5" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <ArrowLeft size={18}/>
            </button>
          )}
          <div className="flex items-center gap-3 hidden sm:flex">
            <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <Palette size={18} className="text-white"/>
            </div>
            <span className="font-black text-lg tracking-tight">QR <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">Stüdyosu</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onToggleTheme && (
            <button onClick={onToggleTheme} className={`flex items-center justify-center w-10 h-10 rounded-[1.25rem] border transition-all shadow-sm active:scale-95 ${dk ? "border-white/10 bg-[#020617] text-slate-300 hover:text-yellow-300" : "border-slate-200 bg-white text-slate-600 hover:text-indigo-600"}`} title={dk ? "Gunduz modu" : "Gece modu"}>
              {dk ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
          )}
          <button onClick={exportPng} className={`hidden sm:flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-violet-500/50 hover:text-violet-400":"border-slate-200 bg-white text-slate-600 hover:border-violet-400"}`}>
            <Download size={14}/> PNG
          </button>
          <button onClick={exportSvg} className={`hidden sm:flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400":"border-slate-200 bg-white text-slate-600 hover:border-emerald-400"}`}>
            <Download size={14}/> SVG
          </button>
          <button onClick={()=>void exportPdf()} className={`hidden md:flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-rose-500/50 hover:text-rose-400":"border-slate-200 bg-white text-slate-600 hover:border-rose-400"}`}>
            <Download size={14}/> PDF
          </button>
          <button onClick={()=>setShowSaveModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] transition-all active:scale-95">
            <Star size={16} strokeWidth={2.5}/> {editingId?"Şablonu Güncelle":"Kaydet"}
          </button>
        </div>
      </header>

      <section className={`relative z-20 mx-4 mb-2 rounded-[1.75rem] border p-3 sm:p-4 ${pnl}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-black uppercase tracking-widest ${tx}`}>Hazır Tasarımlar</p>
            <p className={`mt-1 text-[11px] font-semibold ${sub}`}>Sektörünüze uygun tasarımı seçip stüdyoda özelleştirin.</p>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{QR_STYLE_PRESETS.length + sharedTemplates.length} sistem / public</span>
        </div>
        <div className="flex max-h-24 snap-x gap-2 overflow-x-auto overscroll-x-contain pb-2 custom-scrollbar touch-pan-x">
          {QR_STYLE_PRESETS.map((preset) => {
            const active = selectedId === `preset:${preset.id}`;
            return (
              <button key={preset.id} type="button" onClick={() => loadPreset(preset)} title={`${preset.category}: ${preset.description}`} className={`flex w-36 shrink-0 snap-start items-center gap-2 rounded-xl border p-2 text-left transition ${active ? "border-violet-500 bg-violet-500/10" : dk ? "border-white/10 bg-white/[0.03] hover:border-white/20" : "border-slate-200 bg-white hover:border-violet-300"}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${dk ? "bg-black/30" : "bg-slate-50"}`}><MiniQR config={preset.config as Partial<Cfg>} size={38}/></span>
                <span className="min-w-0"><span className={`block truncate text-[11px] font-black ${tx}`}>{preset.name}</span><span className={`block truncate text-[9px] font-bold ${sub}`}>{preset.category}</span></span>
              </button>
            );
          })}
          {sharedTemplates.map(style => (
            <button key={style.id} type="button" onClick={() => loadTemplate(style)} title={style.description ?? style.name} className={`flex w-36 shrink-0 snap-start items-center gap-2 rounded-xl border p-2 text-left transition ${selectedId === style.id ? "border-violet-500 bg-violet-500/10" : dk ? "border-white/10 bg-white/[0.03] hover:border-white/20" : "border-slate-200 bg-white hover:border-violet-300"}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${dk ? "bg-black/30" : "bg-slate-50"}`}><MiniQR config={style.config as Partial<Cfg>} size={38}/></span>
              <span className="min-w-0"><span className={`block truncate text-[11px] font-black ${tx}`}>{style.name}</span><span className={`block truncate text-[9px] font-bold ${sub}`}>{style.category || "Public"}</span></span>
            </button>
          ))}
        </div>
      </section>

      {/* 3-Column Layout */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 relative z-10 lg:flex-row lg:overflow-hidden">

        {/* LEFT: Templates */}
        <aside className={`max-h-[420px] w-full shrink-0 flex flex-col rounded-[2rem] border overflow-hidden transition-colors duration-500 lg:max-h-none lg:w-72 ${pnl} shadow-xl shadow-black/5 dark:shadow-none`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${dk?"border-white/[0.06]":"border-slate-100"}`}>
            <div className="flex items-center gap-1.5">
              <LayoutTemplate size={16} className="text-violet-500"/>
              <span className={`text-sm font-black tracking-tight ${tx}`}>Koleksiyon</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-inner ${dk?"bg-white/10 text-slate-300":"bg-slate-200 text-slate-600"}`}>{templates.length}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={load} title="Yenile" aria-label="Şablonları yenile" className={`p-2 rounded-xl transition-all ${sub} hover:text-violet-500 ${dk?"hover:bg-white/5":"hover:bg-slate-100"}`}>
                <RefreshCw size={14} className={loadingTpl?"animate-spin":""}/>
              </button>
              <button onClick={resetToNew}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm active:scale-95 ${dk?"text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20":"text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100"}`}>
                <Plus size={12} strokeWidth={3}/> Yeni
              </button>
            </div>
          </div>

          <div className={`shrink-0 border-b p-3 ${dk ? "border-white/[0.06]" : "border-slate-100"}`}>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Koleksiyon Filtreleri</p>
              <span className={`text-[10px] font-black ${sub}`}>{collections.length} koleksiyon</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCollectionId("")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${!collectionId ? "bg-violet-600 text-white shadow-sm" : dk ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Tümü <span className="opacity-70">({templates.length})</span>
              </button>
              {collections.map((collection) => {
                const active = collectionId === collection.id;
                const count = collectionCounts.get(collection.id) ?? 0;
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setCollectionId(collection.id)}
                    className={`max-w-full rounded-full px-3 py-1.5 text-[11px] font-black transition ${active ? "bg-violet-600 text-white shadow-sm" : dk ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    title={collection.description ?? collection.name}
                  >
                    <span className="inline-block max-w-[140px] truncate align-bottom">{collection.name}</span>
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <p className={`shrink-0 px-4 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest ${sub}`}>Tasarımlarım · yalnızca size özel</p>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {loadingTpl ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-violet-500"/></div>
            ) : ownedTemplates.length === 0 ? (
              <div className={`flex flex-col items-center py-10 gap-2 text-center ${sub}`}>
                <div className="w-16 h-16 rounded-[1.5rem] bg-violet-500/10 flex items-center justify-center mb-2 shadow-inner">
                  <Palette size={28} className="text-violet-400/60"/>
                </div>
                <p className="text-sm font-medium leading-relaxed">Henüz şablon yok.<br/>İlk stili tasarla.</p>
              </div>
            ) : pagedTemplates.map(style => (
              <div key={style.id} onClick={()=>loadTemplate(style)}
                className={`group relative rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden ${
                  selectedId===style.id
                    ? "border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                    : dk ? "border-white/5 hover:border-white/20 hover:-translate-y-1" : "border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1"
                }`}
                style={{ background: selectedId===style.id ? (dk?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.05)") : dk ? "rgba(255,255,255,0.02)" : "white" }}>
                
                <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

                {selectedId===style.id && (
                  <div className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
                    <Check size={10} className="text-white" strokeWidth={3}/>
                  </div>
                )}
                <div className="flex items-center gap-3 p-2.5 pr-9 relative z-10">
                  <div className={`h-[68px] w-[68px] shrink-0 rounded-xl overflow-hidden flex items-center justify-center shadow-inner ${dk?"bg-black/40":"bg-slate-50"}`}>
                    <MiniQR config={style.config as Partial<Cfg>}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${tx}`}>{style.name}</p>
                    <p className={`text-[10px] font-medium mt-1 ${sub}`}>Oluşturulma: {new Date(style.created_at).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>
                <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute right-2 bottom-2 z-20 rounded-xl p-1 backdrop-blur-xl ${dk?"bg-black/70":"bg-white/90"}`}>
                  <button type="button" onClick={e=>{e.stopPropagation();loadTemplate(style);}}
                    className={`w-8 py-2 rounded-lg text-[10px] font-black transition-colors ${dk?"text-slate-300 hover:text-violet-400 hover:bg-violet-500/20":"text-slate-600 hover:text-violet-600 hover:bg-violet-100"}`} title="Düzenle">
                    <Pencil size={13} className="mx-auto"/>
                  </button>
                  <button type="button" onClick={e=>{e.stopPropagation();handleDelete(style.id);}}
                    className={`w-8 flex items-center justify-center py-2 rounded-lg transition-colors ${dk?"text-rose-400 hover:bg-rose-500/20":"text-rose-500 hover:bg-rose-100"}`} title="Sil">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
            </div>
            {templatePageCount > 1 && (
              <div className={`flex shrink-0 items-center justify-between border-t px-3 py-2 ${dk ? "border-white/10" : "border-slate-100"}`}>
                <button type="button" disabled={templatePage === 1} onClick={() => setTemplatePage(page => page - 1)} className="rounded-lg px-2 py-1 text-xs font-bold text-violet-600 disabled:opacity-30">Önceki</button>
                <span className={`text-[10px] font-black ${sub}`}>{templatePage} / {templatePageCount}</span>
                <button type="button" disabled={templatePage === templatePageCount} onClick={() => setTemplatePage(page => page + 1)} className="rounded-lg px-2 py-1 text-xs font-bold text-violet-600 disabled:opacity-30">Sonraki</button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Editor */}
        <div className={`min-h-[620px] flex-1 flex flex-col rounded-[2rem] border overflow-hidden transition-colors duration-500 lg:min-h-0 ${pnl} shadow-xl shadow-black/5 dark:shadow-none`}>
          {/* Panel tabs */}
          <div className={`flex gap-1.5 overflow-x-auto p-2.5 border-b shrink-0 ${dk?"border-white/10 bg-black/20":"border-slate-200 bg-slate-50/50"}`}>
            {panels.map((pn, i) => (
              <button key={pn.id} onClick={()=>setActivePanel(pn.id)}
                className={`flex min-w-fit shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-[11px] font-bold transition-all duration-300 sm:px-4 sm:text-xs ${
                  activePanel===pn.id ? "bg-white dark:bg-white/10 text-violet-600 dark:text-violet-300 shadow-sm" : `border-transparent ${sub} hover:bg-black/5 dark:hover:bg-white/5`}`}>
                <span className={activePanel===pn.id ? "scale-110 transition-transform" : "opacity-70"}>{pn.icon}</span> 
                <span>{pn.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 space-y-8 max-w-xl mx-auto">

              {/* Preview URL */}
              <div className={`flex flex-col gap-2`}>
                <label className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Test URL&apos;si</label>
                <div className={`flex items-center px-4 py-3.5 rounded-[1.5rem] border shadow-inner transition-all ${dk?"bg-[#020617]/50 border-white/10 focus-within:border-violet-500":"bg-slate-50 border-slate-200 focus-within:border-violet-400"}`}>
                <input type="url" value={cfg.previewUrl} onChange={e=>p("previewUrl",e.target.value)}
                  placeholder="https://example.com"
                  className={`flex-1 text-sm font-medium bg-transparent outline-none ${dk?"text-white placeholder:text-slate-600":"text-slate-900 placeholder:text-slate-400"}`}/>
                </div>
              </div>

              {/* DOTS */}
              {activePanel==="dots" && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Nokta Şekli</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(["square","rounded","extra-rounded","dots","classy","classy-rounded"] as DotType[]).map(d => (
                        <button key={d} type="button" onClick={()=>p("dotType",d)}
                          className={`flex flex-col items-center gap-3 py-5 rounded-[1.5rem] border transition-all duration-300 ${
                            cfg.dotType===d ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.02]"
                              : dk?"border-white/10 text-slate-500 hover:border-white/20 bg-black/20 hover:bg-white/5":"border-slate-200 text-slate-500 hover:border-violet-300 bg-white hover:shadow-md"}`}>
                          <span className="text-2xl font-black opacity-80">
                            {d==="square"?"▪":d==="rounded"?"●":d==="extra-rounded"?"⬬":d==="dots"?"•":d==="classy"?"◆":"◈"}
                          </span>
                          <span className="text-xs font-bold">{
                            {square:"Kare",rounded:"Yuvarlak","extra-rounded":"Ekstra Y.",dots:"Nokta",classy:"Klasik","classy-rounded":"Kl.Yuv."}[d]
                          }</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={`flex items-center justify-between p-4 rounded-[1.5rem] border mb-6 ${dk?"bg-white/5 border-white/10":"bg-slate-50 border-slate-200"}`}>
                      <div>
                        <p className={`text-sm font-black ${tx}`}>Gradient Renk</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${sub}`}>Modern geçişli renkler kullan</p>
                      </div>
                        <Toggle on={cfg.useGradient} onChange={()=>p("useGradient",!cfg.useGradient)}/>
                    </div>

                    {cfg.useGradient ? (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#020617] border dark:border-white/10">
                          {(["linear","radial"] as const).map(gt => (
                            <button key={gt} type="button" onClick={()=>p("gradientType",gt)}
                              className={`flex-1 py-2.5 text-sm rounded-xl font-bold transition-all shadow-sm ${
                                cfg.gradientType===gt ? "bg-white dark:bg-white/10 text-violet-600 dark:text-violet-300"
                                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent"}`}>
                              {gt==="linear"?"Doğrusal":"Radyal"}
                            </button>
                          ))}
                        </div>
                        {cfg.gradientType==="linear" && (
                          <div className={`p-5 rounded-[1.5rem] border ${dk?"border-white/10 bg-black/20":"border-slate-200 bg-white"}`}>
                            <div className="flex items-center justify-between mb-4">
                              <p className={`text-xs font-bold uppercase tracking-widest ${sub}`}>Açı Seçimi</p>
                              <span className={`text-sm font-black px-3 py-1 rounded-lg ${dk?"bg-violet-500/20 text-violet-300":"bg-violet-100 text-violet-700"}`}>{cfg.gradientAngle}°</span>
                            </div>
                            <input type="range" min={0} max={360} step={5} value={cfg.gradientAngle}
                              onChange={e=>p("gradientAngle",Number(e.target.value))} className="w-full accent-violet-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"/>
                            <div className="flex justify-between mt-4">
                              {[0,45,90,135,180,225,270,315].map(a => (
                                <button key={a} type="button" onClick={()=>p("gradientAngle",a)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${cfg.gradientAngle===a?"text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-500/30":`${sub} hover:bg-slate-100 dark:hover:bg-white/5`}`}>{a}°</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <ColorPicker label="Renk 1" val={cfg.color1} onChange={v=>p("color1",v)}/>
                          <ColorPicker label="Renk 2" val={cfg.color2} onChange={v=>p("color2",v)}/>
                        </div>
                        <div className="h-16 rounded-[1.5rem] overflow-hidden border shadow-inner" style={{
                          borderColor: dk?"rgba(255,255,255,0.1)":"#e2e8f0",
                          background: cfg.gradientType==="radial"
                            ? `radial-gradient(circle, ${cfg.color1}, ${cfg.color2})`
                            : `linear-gradient(${cfg.gradientAngle}deg, ${cfg.color1}, ${cfg.color2})`
                        }}/>
                      </div>
                    ) : (
                      <ColorPicker label="Nokta Rengi" val={cfg.dotColor} onChange={v=>p("dotColor",v)}/>
                    )}
                  </div>
                </div>
              )}

              {/* EYES */}
              {activePanel==="eyes" && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Dış Çerçeve</p>
                    <div className="grid grid-cols-3 gap-3">
                      {([{v:"square" as EyeFrameType,l:"Kare"},{v:"extra-rounded" as EyeFrameType,l:"Yuvarlak"},{v:"dot" as EyeFrameType,l:"Daire"}]).map(o => (
                        <button key={o.v} type="button" onClick={()=>p("eyeFrameType",o.v)}
                          className={`flex flex-col items-center gap-3 py-5 rounded-[1.5rem] border transition-all duration-300 ${
                            cfg.eyeFrameType===o.v ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.02]"
                              : dk?"border-white/10 text-slate-500 hover:border-white/20 bg-black/20 hover:bg-white/5":"border-slate-200 text-slate-500 hover:border-violet-300 bg-white hover:shadow-md"}`}>
                          <div className={`w-7 h-7 border-[3px] ${o.v==="dot"?"rounded-full":o.v==="extra-rounded"?"rounded-xl":"rounded-sm"}`}
                            style={{ borderColor:"currentColor" }}/>
                          <span className="text-xs font-bold">{o.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>İç Nokta</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([{v:"square" as EyeDotType,l:"Kare"},{v:"dot" as EyeDotType,l:"Daire"}]).map(o => (
                        <button key={o.v} type="button" onClick={()=>p("eyeDotType",o.v)}
                          className={`flex flex-col items-center gap-3 py-5 rounded-[1.5rem] border transition-all duration-300 ${
                            cfg.eyeDotType===o.v ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.02]"
                              : dk?"border-white/10 text-slate-500 hover:border-white/20 bg-black/20 hover:bg-white/5":"border-slate-200 text-slate-500 hover:border-violet-300 bg-white hover:shadow-md"}`}>
                          <div className={`w-4 h-4 ${o.v==="dot"?"rounded-full":"rounded-sm"}`} style={{ background:"currentColor" }}/>
                          <span className="text-xs font-bold">{o.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={`flex items-center justify-between p-4 rounded-[1.5rem] border mb-6 ${dk?"bg-white/5 border-white/10":"bg-slate-50 border-slate-200"}`}>
                      <div>
                        <p className={`text-sm font-black ${tx}`}>Özel Göz Rengi</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${sub}`}>Dış çerçeve ve iç nokta rengini ayır</p>
                      </div>
                      <Toggle on={cfg.useCustomEyeColor} onChange={()=>p("useCustomEyeColor",!cfg.useCustomEyeColor)}/>
                    </div>
                    {cfg.useCustomEyeColor
                      && <ColorPicker label="Göz Rengi Seçimi" val={cfg.eyeColor} onChange={v=>p("eyeColor",v)}/>
                    }
                  </div>
                </div>
              )}

              {/* COLORS */}
              {activePanel==="colors" && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <div className={`flex items-center justify-between p-4 rounded-[1.5rem] border mb-6 ${dk?"bg-white/5 border-white/10":"bg-slate-50 border-slate-200"}`}>
                      <div>
                        <p className={`text-sm font-black ${tx}`}>Şeffaf Arka Plan</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${sub}`}>PNG olarak kaydederken arkayı siler</p>
                      </div>
                        <Toggle on={cfg.bgTransparent} onChange={()=>p("bgTransparent",!cfg.bgTransparent)}/>
                    </div>
                    {!cfg.bgTransparent && <ColorPicker label="Arka Plan Rengi" val={cfg.bgColor} onChange={v=>p("bgColor",v)}/>}
                  </div>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Hazır Tema Renkleri</p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {l:"Klasik",   dot:"#000000",bg:"#ffffff"},
                        {l:"Lacivert", dot:"#1e3a5f",bg:"#f0f7ff"},
                        {l:"Mor",      dot:"#6d28d9",bg:"#faf5ff"},
                        {l:"Kırmızı",  dot:"#dc2626",bg:"#fff5f5"},
                        {l:"Yeşil",    dot:"#059669",bg:"#f0fdf4"},
                        {l:"Turuncu",  dot:"#d97706",bg:"#fffbeb"},
                        {l:"Gece",     dot:"#e2e8f0",bg:"#0f172a"},
                        {l:"Çelik",    dot:"#374151",bg:"#f9fafb"},
                      ].map(pr=>(
                        <button key={pr.l} type="button"
                          onClick={()=>{p("dotColor",pr.dot);p("bgColor",pr.bg);p("useGradient",false);p("bgTransparent",false);}}
                          className={`group flex flex-col items-center gap-2 py-3 rounded-2xl border transition-all hover:-translate-y-1 ${dk?"border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20 hover:shadow-lg":"border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"}`}>
                          <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded-full border shadow-inner group-hover:scale-110 transition-transform" style={{background:pr.dot,borderColor:"rgba(0,0,0,0.15)"}}/>
                            <div className="w-4 h-4 rounded-full border shadow-inner group-hover:scale-110 transition-transform" style={{background:pr.bg,borderColor:"rgba(0,0,0,0.15)"}}/>
                          </div>
                          <span className={`text-[10px] font-bold ${sub}`}>{pr.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Gradient Presetleri</p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {l:"Sunset",  c1:"#f97316",c2:"#ec4899",a:135},
                        {l:"Ocean",   c1:"#06b6d4",c2:"#3b82f6",a:135},
                        {l:"Neon",    c1:"#8b5cf6",c2:"#06b6d4",a:90},
                        {l:"Fire",    c1:"#ef4444",c2:"#f97316",a:45},
                        {l:"Forest",  c1:"#10b981",c2:"#06b6d4",a:135},
                        {l:"Galaxy",  c1:"#6366f1",c2:"#ec4899",a:135},
                        {l:"Gold",    c1:"#f59e0b",c2:"#ef4444",a:90},
                        {l:"Minty",   c1:"#34d399",c2:"#60a5fa",a:135},
                      ].map(g=>(
                        <button key={g.l} type="button"
                          onClick={()=>{p("useGradient",true);p("gradientType","linear");p("color1",g.c1);p("color2",g.c2);p("gradientAngle",g.a);}}
                          className={`group flex flex-col items-center gap-2 py-3 rounded-2xl border transition-all hover:-translate-y-1 ${dk?"border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20 hover:shadow-lg":"border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"}`}>
                          <div className="w-10 h-5 rounded-md shadow-inner group-hover:scale-110 transition-transform" style={{background:`linear-gradient(${g.a}deg,${g.c1},${g.c2})`}}/>
                          <span className={`text-[10px] font-bold ${sub}`}>{g.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LOGO */}
              {activePanel==="logo" && (
                <div className="space-y-8 animate-fade-in">
                  {logoPreview ? (
                    <div className="space-y-8">
                      <div className={`flex items-center gap-4 p-4 rounded-[1.5rem] border shadow-sm ${dk?"bg-white/5 border-white/10":"bg-slate-50 border-slate-200"}`}>
                        <div className={`w-16 h-16 shrink-0 overflow-hidden relative border-[3px] bg-white shadow-inner ${
                          cfg.logoShape==="circle"?"rounded-full":cfg.logoShape==="rounded"?"rounded-2xl":"rounded-lg"}`}
                          style={{borderColor:dk?"rgba(255,255,255,0.3)":"#e2e8f0"}}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logoPreview} alt="" className="w-full h-full object-contain p-1"/>
                          {logoLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={12} className="animate-spin text-white"/></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black truncate ${tx}`}>{logo?.name}</p>
                          {logoData && !logoLoading && <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-1">✓ Başarıyla Eklendi</p>}
                        </div>
                        <button onClick={()=>{setLogo(null);setLogoData(null);setLogoPreview(null);}} title="Logoyu kaldır" aria-label="Logoyu kaldır" className={`p-2 rounded-xl transition-all ${dk?"bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20":"bg-white text-slate-500 hover:text-rose-500 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 shadow-sm"}`}><X size={16}/></button>
                      </div>

                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Çerçeve Şekli</p>
                        <div className="grid grid-cols-3 gap-3">
                          {([{v:"circle" as LogoShape,l:"Daire",icon:<Circle size={20}/>},{v:"rounded" as LogoShape,l:"Yuvarlak",icon:<LayoutTemplate size={20}/>},{v:"square" as LogoShape,l:"Kare",icon:<Square size={20}/>}]).map(o=>(
                            <button key={o.v} type="button" onClick={()=>handleShapeChange(o.v)}
                              className={`flex flex-col items-center gap-3 py-5 rounded-[1.5rem] border transition-all duration-300 ${
                                cfg.logoShape===o.v?"border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.02]"
                                  :dk?"border-white/10 text-slate-500 hover:border-white/20 bg-black/20 hover:bg-white/5":"border-slate-200 text-slate-500 hover:border-violet-300 bg-white hover:shadow-md"}`}>
                              {o.icon}<span className="text-xs font-bold">{o.l}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Logo Boyutu</p>
                          <span className={`text-sm font-black px-3 py-1 rounded-lg ${dk?"bg-violet-500/20 text-violet-300":"bg-violet-100 text-violet-700"}`}>%{Math.round(cfg.logoSize*100)}</span>
                        </div>
                        <input type="range" min={15} max={45} step={1} value={Math.round(cfg.logoSize*100)}
                          onChange={e=>handleSizeChange(Number(e.target.value)/100)} className="w-full accent-violet-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center gap-4 p-12 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-300 ${
                      dk?"border-white/10 bg-white/[0.02] hover:border-violet-500/50 hover:bg-violet-500/5":"border-slate-200 bg-slate-50/50 hover:border-violet-400 hover:bg-violet-50 hover:shadow-lg hover:-translate-y-1"}`}>
                      <div className={`w-16 h-16 rounded-[1.5rem] shadow-inner flex items-center justify-center ${dk?"bg-black/40":"bg-white"}`}>
                        <ImageIcon size={28} className="text-violet-500"/>
                      </div>
                      <div className="text-center">
                        <p className={`text-base font-black ${dk?"text-slate-200":"text-slate-700"}`}>Logo Yükle</p>
                        <p className={`text-xs font-medium mt-1.5 ${sub}`}>PNG, JPG, SVG · Otomatik şeffaflık maskesi</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleLogoFile(f);}}/>
                    </label>
                  )}
                </div>
              )}

              {/* ADVANCED */}
              {activePanel==="advanced" && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Kenar Boşluğu</p>
                      <span className={`text-sm font-black px-3 py-1 rounded-lg ${dk?"bg-violet-500/20 text-violet-300":"bg-violet-100 text-violet-700"}`}>{cfg.margin}px</span>
                    </div>
                    <input type="range" min={0} max={60} step={4} value={cfg.margin}
                      onChange={e=>p("margin",Number(e.target.value))} className="w-full accent-violet-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"/>
                  </div>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Hata Düzeltme</p>
                    <div className="grid grid-cols-4 gap-3">
                      {([{l:"L",label:"Düşük",desc:"7%"},{l:"M",label:"Orta",desc:"15%"},{l:"Q",label:"İyi",desc:"25%"},{l:"H",label:"Yüksek",desc:"30%"}] as const).map(ec=>(
                        <button key={ec.l} type="button" onClick={()=>p("ecLevel",ec.l)}
                          className={`flex flex-col items-center gap-1 py-4 rounded-[1.5rem] border transition-all duration-300 ${
                            cfg.ecLevel===ec.l?"border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.02]"
                              :dk?"border-white/10 text-slate-500 hover:border-white/20 bg-black/20 hover:bg-white/5":"border-slate-200 text-slate-500 hover:border-violet-300 bg-white hover:shadow-md"}`}>
                          <span className="text-xl font-black">{ec.l}</span>
                          <span className="text-[10px] font-bold">{ec.label}</span>
                          <span className={`text-[9px] font-medium ${sub}`}>{ec.desc}</span>
                        </button>
                      ))}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-1 ${sub}`}><Sparkles size={12}/> Logo eklendiğinde H veya Q önerilir.</p>
                  </div>

                  <button onClick={resetToNew}
                    className={`flex items-center justify-center gap-2 w-full px-4 py-4 text-sm font-bold rounded-2xl border transition-all active:scale-95 ${dk?"border-white/10 bg-white/5 text-slate-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400":"border-slate-200 bg-slate-50 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 shadow-sm"}`}>
                    <RefreshCw size={16}/> Varsayılana Sıfırla
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className={`min-h-[520px] w-full shrink-0 flex flex-col rounded-[2rem] border overflow-hidden transition-colors duration-500 lg:min-h-0 lg:w-80 xl:w-96 ${pnl} shadow-2xl shadow-black/10 dark:shadow-none`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${dk?"border-white/10":"border-slate-100"}`}>
            <p className={`text-sm font-black tracking-tight ${tx}`}>Canlı Önizleme</p>
            <button onClick={()=>setPreviewZoom(!previewZoom)}
              className={`p-2 rounded-xl transition-all shadow-sm active:scale-95 ${dk?"bg-[#020617] border border-white/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/50":"bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300"}`} title="Büyüt">
              <ZoomIn size={16}/>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 relative">
            <div className={`rounded-[2rem] border p-5 transition-all duration-500 hover:scale-105 ${dk?"border-white/10 bg-black/40":"border-slate-200 bg-white"}`}
              style={{ boxShadow: dk?"0 30px 60px rgba(0,0,0,0.6)":"0 30px 60px rgba(0,0,0,0.15)" }}>
              <LiveQR cfg={cfg} logo={logoData} size={previewZoom?280:240}/>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border font-black shadow-sm ${dk?"border-white/10 text-slate-400 bg-black/40":"border-slate-200 text-slate-500 bg-white"}`}>
                {cfg.dotType}
              </span>
              {cfg.useGradient && (
                <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-500 bg-violet-500/10 font-black shadow-sm">gradient</span>
              )}
              {logoData && (
                <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-black shadow-sm">logo ✓</span>
              )}
              <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border font-black shadow-sm ${dk?"border-white/10 text-slate-400 bg-black/40":"border-slate-200 text-slate-500 bg-white"}`}>
                EC:{cfg.ecLevel}
              </span>
            </div>
          </div>

          <div className={`p-6 space-y-3 border-t backdrop-blur-3xl ${dk?"border-white/10 bg-black/20":"border-slate-100 bg-white/50"}`}>
            {editingId && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm ${dk?"bg-amber-500/10 border border-amber-500/30":"bg-amber-50 border border-amber-200"}`}>
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-500 flex-1 truncate flex items-center gap-2"><Pencil size={12}/> Düzenleniyor: {saveName}</span>
                <button onClick={resetToNew} title="Düzenlemeyi bırak" aria-label="Düzenlemeyi bırak" className="text-amber-500/60 hover:text-amber-500 shrink-0 transition-colors"><X size={16}/></button>
              </div>
            )}
            <button onClick={()=>setShowSaveModal(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-base font-black text-white shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(124,58,237,0.6)] transition-all active:scale-95">
              <Star size={18} strokeWidth={2.5}/> {editingId?"Stili Güncelle":"Koleksiyona Kaydet"}
            </button>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={exportPng} className={`flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-violet-500/50 hover:text-violet-400":"border-slate-200 bg-white text-slate-600 hover:border-violet-300"}`}>
                <Download size={14}/> PNG
              </button>
              <button onClick={exportSvg} className={`flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400":"border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>
                <Download size={14}/> SVG
              </button>
              <button onClick={()=>void exportPdf()} className={`flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-2xl border transition-all shadow-sm active:scale-95 ${dk?"border-white/10 bg-[#020617] text-slate-300 hover:border-rose-500/50 hover:text-rose-400":"border-slate-200 bg-white text-slate-600 hover:border-rose-300"}`}>
                <Download size={14}/> PDF
              </button>
            </div>
            <p className={`text-[10px] font-bold text-center mt-2 ${sub}`}>QR Kod oluştururken bu şablonu seçebilirsin</p>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-md" onClick={()=>setShowSaveModal(false)}/>
          <div className={`relative z-10 w-full max-w-md border rounded-[2rem] p-8 shadow-2xl animate-scale-in backdrop-blur-3xl ${dk?"bg-[#0b1121]/95 border-violet-500/20 shadow-[0_0_40px_rgba(124,58,237,0.15)]":"bg-white/95 border-slate-200/60 shadow-xl"}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Star size={20} className="text-white"/>
              </div>
              <div>
                <h3 className={`font-black text-xl ${tx}`}>{editingId?"Şablonu Güncelle":"Şablon Kaydet"}</h3>
                <p className={`text-xs font-medium mt-1 ${sub}`}>Koleksiyonunuza ekleyin</p>
              </div>
            </div>
            <input autoFocus value={saveName} onChange={e=>setSaveName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&save()}
              placeholder="Örn: Mor Gradient Şablonum"
              className={`w-full border rounded-[1.5rem] px-5 py-4 text-sm font-bold outline-none transition-all mb-3 shadow-inner ${inp}`}/>
            <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className={`mb-3 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${inp}`}>
              <option value="">Koleksiyonsuz</option>
              {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
            <div className="mb-4 flex gap-2">
              <input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="Yeni koleksiyon adı" maxLength={60} className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${inp}`} />
              <button type="button" onClick={() => void addCollection()} disabled={!newCollectionName.trim() || collectionSaving} title="Koleksiyon ekle" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition hover:bg-violet-200 disabled:opacity-40 dark:bg-violet-500/20 dark:text-violet-200">
                {collectionSaving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
            {saveError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">{saveError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={()=>setShowSaveModal(false)}
                className={`flex-1 py-3.5 text-sm font-bold border rounded-2xl transition-colors active:scale-95 ${dk?"border-white/10 bg-[#020617]/50 text-slate-400 hover:border-white/30 hover:text-white":"border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"}`}>
                İptal
              </button>
              <button onClick={save} disabled={!saveName.trim()||saving}
                className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 text-sm font-black rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 active:scale-95">
                {saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16} strokeWidth={2.5}/>}
                {editingId?"Güncelle":"Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

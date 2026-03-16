import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft, Save, Trash2, Check, Plus, Loader2,
  X, Star, Download, RefreshCw, Sun, Moon,
  Circle, Square, LayoutTemplate, Palette, Sliders,
  Image as ImageIcon, Eye, ChevronRight, Sparkles, ZoomIn,
} from "lucide-react";
import { fetchStyles, saveStyle, deleteStyle, type QrStyle } from "@/lib/supabase";
import { createLogoMask } from "@/lib/logoMask";

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
        const qr = new QRCodeStyling(opts as never);
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

function MiniQR({ style }: { style: QrStyle }) {
  const cfg = { ...DEFAULT, ...(style.config as Partial<Cfg>) };
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!divRef.current) return;
    let cancelled = false;
    divRef.current.innerHTML = "";
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !divRef.current) return;
      const qr = new QRCodeStyling(buildOpts(cfg, null, 88) as never);
      qr.append(divRef.current);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.id, JSON.stringify(style.config)]);
  return <div ref={divRef} style={{ width: 88, height: 88 }} />;
}

export function TemplatesSection({ isDark, onBack }: { isDark: boolean; onBack?: () => void }) {
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

  const p = useCallback(<K extends keyof Cfg>(k: K, v: Cfg[K]) =>
    setCfg(prev => ({ ...prev, [k]: v })), []);

  const load = useCallback(async () => {
    setLoadingTpl(true);
    try { setTemplates(await fetchStyles()); } finally { setLoadingTpl(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadTemplate = (style: QrStyle) => {
    setSelectedId(style.id); setEditingId(style.id);
    setSaveName(style.name);
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

  const resetToNew = () => {
    setSelectedId(null); setEditingId(null);
    setSaveName(""); setCfg(DEFAULT);
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
    try {
      // logoData'yı config içine göm - böylece DB'ye kaydedilir
      const configToSave: Record<string, unknown> = {
        ...(cfg as unknown as Record<string, unknown>),
        ...(logoData ? { savedLogoData: logoData } : {}),
      };
      const style = await saveStyle(saveName.trim(), configToSave, editingId ?? undefined);
      setTemplates(prev => editingId ? prev.map(t => t.id === editingId ? style : t) : [style, ...prev]);
      setSelectedId(style.id); setEditingId(style.id); setShowSaveModal(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şablonu sil?")) return;
    await deleteStyle(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) resetToNew();
  };

  const exportPng = async () => {
    const { default: Q } = await import("qr-code-styling");
    await (new Q(buildOpts(cfg, logoData) as never) as unknown as { download:(o:object)=>Promise<void> }).download({ name:"qrhub-template", extension:"png" });
  };
  const exportSvg = async () => {
    const { default: Q } = await import("qr-code-styling");
    await (new Q(buildOpts(cfg, logoData, 3000) as never) as unknown as { download:(o:object)=>Promise<void> }).download({ name:"qrhub-template", extension:"svg" });
  };

  // Theme tokens
  const dk = isDark;
  const tx    = dk ? "text-slate-100"    : "text-slate-900";
  const sub   = dk ? "text-slate-500"    : "text-slate-400";
  const pnl   = dk ? "bg-[#0d1117] border-white/[0.07]" : "bg-white border-slate-200";
  const inp   = dk ? "bg-white/5 border-white/10 text-slate-100 focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-400";

  const Toggle = ({ on, onChange }: { on:boolean; onChange:()=>void }) => (
    <button type="button" onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-all ${on ? "bg-violet-600" : dk ? "bg-white/10" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on?"translate-x-4":""}`}/>
    </button>
  );

  const ColorPicker = ({ label, val, onChange }: { label:string; val:string; onChange:(v:string)=>void }) => (
    <div className="space-y-1.5">
      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{label}</p>
      <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2 ${dk?"bg-white/5 border-white/10":"bg-slate-50 border-slate-200"}`}>
        <div className="relative w-7 h-7 shrink-0">
          <input type="color" value={val} onChange={e=>onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
          <div className="w-7 h-7 rounded-lg border-2" style={{ backgroundColor:val, borderColor:dk?"rgba(255,255,255,0.2)":"#e2e8f0" }}/>
        </div>
        <input type="text" value={val} onChange={e=>onChange(e.target.value)}
          className={`flex-1 text-[12px] font-mono bg-transparent border-0 outline-none ${dk?"text-slate-300":"text-slate-700"}`}/>
      </div>
    </div>
  );

  const panels: { id:Panel; label:string; icon:React.ReactNode }[] = [
    { id:"dots",     label:"Noktalar",  icon:<Sparkles size={13}/> },
    { id:"eyes",     label:"Gözler",    icon:<Eye size={13}/> },
    { id:"colors",   label:"Renkler",   icon:<Palette size={13}/> },
    { id:"logo",     label:"Logo",      icon:<ImageIcon size={13}/> },
    { id:"advanced", label:"Gelişmiş",  icon:<Sliders size={13}/> },
  ];

  return (
    <div className={`min-h-screen ${tx}`} style={{ background: dk ? "#07090f" : "#f1f5f9" }}>
      {/* Nav */}
      <header className={`border-b ${dk?"bg-[#07090f]/95 border-white/[0.07]":"bg-white/95 border-slate-200"} px-5 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`flex items-center gap-1.5 text-xs transition-colors ${sub} hover:text-violet-400`}>
            <ArrowLeft size={13}/> Dashboard
          </button>
          <span className={dk?"text-slate-700":"text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Palette size={11} className="text-white"/>
            </div>
            <span className="font-black text-sm">QR <span className="text-violet-400">Şablon Stüdyosu</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
<button onClick={exportPng} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${dk?"border-white/10 text-slate-400 hover:border-violet-500/50 hover:text-violet-300":"border-slate-200 text-slate-500"}`}>
            <Download size={11}/> PNG
          </button>
          <button onClick={exportSvg} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${dk?"border-white/10 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-300":"border-slate-200 text-slate-500"}`}>
            <Download size={11}/> SVG
          </button>
          <button onClick={()=>setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/20 transition-all">
            <Star size={12}/> {editingId?"Güncelle":"Kaydet"}
          </button>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex h-[calc(100vh-53px)]">

        {/* LEFT: Templates */}
        <aside className={`w-60 shrink-0 border-r flex flex-col ${dk?"border-white/[0.07] bg-[#090c14]":"border-slate-200 bg-white"}`}>
          <div className={`flex items-center justify-between px-3 py-2.5 border-b ${dk?"border-white/[0.06]":"border-slate-100"}`}>
            <div className="flex items-center gap-1.5">
              <LayoutTemplate size={12} className="text-violet-400"/>
              <span className={`text-xs font-bold ${tx}`}>Şablonlar</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dk?"bg-white/5 text-slate-500":"bg-slate-100 text-slate-400"}`}>{templates.length}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={load} className={`p-1.5 rounded-lg ${sub} hover:text-violet-400`}>
                <RefreshCw size={11} className={loadingTpl?"animate-spin":""}/>
              </button>
              <button onClick={resetToNew}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${dk?"text-violet-400 border-violet-500/30 hover:bg-violet-500/10":"text-violet-500 border-violet-200 hover:bg-violet-50"}`}>
                <Plus size={10}/> Yeni
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loadingTpl ? (
              <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-violet-400"/></div>
            ) : templates.length === 0 ? (
              <div className={`flex flex-col items-center py-10 gap-2 text-center ${sub}`}>
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <Palette size={18} className="text-violet-400/50"/>
                </div>
                <p className="text-xs leading-relaxed">Henüz şablon yok.<br/>Tasarla ve kaydet.</p>
              </div>
            ) : templates.map(style => (
              <div key={style.id} onClick={()=>loadTemplate(style)}
                className={`group relative rounded-xl border cursor-pointer transition-all overflow-hidden ${
                  selectedId===style.id
                    ? "border-violet-500 shadow-md shadow-violet-900/20"
                    : dk ? "border-white/[0.07] hover:border-white/20" : "border-slate-200 hover:border-slate-300"
                }`}
                style={{ background: selectedId===style.id ? (dk?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.04)") : dk ? "rgba(255,255,255,0.02)" : "white" }}>
                {selectedId===style.id && (
                  <div className="absolute top-2 right-2 z-10 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check size={8} className="text-white"/>
                  </div>
                )}
                <div className="flex items-center gap-2.5 p-2">
                  <div className={`w-[88px] h-[88px] shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${dk?"bg-white/5":"bg-slate-100"}`}>
                    <MiniQR style={style}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs truncate ${tx}`}>{style.name}</p>
                    <p className={`text-[10px] mt-0.5 ${sub}`}>{new Date(style.created_at).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>
                <div className={`flex gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border-t ${dk?"border-white/5 bg-[#090c14]":"border-slate-100 bg-white"}`}>
                  <button type="button" onClick={e=>{e.stopPropagation();loadTemplate(style);}}
                    className={`flex-1 text-[10px] py-1 rounded-lg font-semibold transition-colors ${dk?"text-slate-400 hover:text-violet-400 hover:bg-violet-500/10":"text-slate-500 hover:text-violet-600 hover:bg-violet-50"}`}>
                    Düzenle
                  </button>
                  <button type="button" onClick={e=>{e.stopPropagation();handleDelete(style.id);}}
                    className={`flex-1 text-[10px] py-1 rounded-lg font-semibold transition-colors ${dk?"text-slate-400 hover:text-red-400 hover:bg-red-500/10":"text-slate-500 hover:text-red-500 hover:bg-red-50"}`}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className={`flex border-b shrink-0 ${dk?"border-white/[0.07] bg-[#090c14]":"border-slate-200 bg-slate-50"}`}>
            {panels.map(pn => (
              <button key={pn.id} onClick={()=>setActivePanel(pn.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  activePanel===pn.id ? "border-violet-500 text-violet-400" : `border-transparent ${sub} hover:text-violet-400/70`}`}>
                {pn.icon} {pn.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5 max-w-lg">

              {/* Preview URL */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dk?"bg-white/[0.02] border-white/[0.07]":"bg-slate-50 border-slate-200"}`}>
                <span className={`text-[11px] shrink-0 font-semibold ${sub}`}>Preview URL:</span>
                <input type="url" value={cfg.previewUrl} onChange={e=>p("previewUrl",e.target.value)}
                  placeholder="https://example.com"
                  className={`flex-1 text-xs bg-transparent outline-none ${dk?"text-slate-300 placeholder:text-slate-600":"text-slate-700 placeholder:text-slate-400"}`}/>
              </div>

              {/* DOTS */}
              {activePanel==="dots" && (
                <div className="space-y-5">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Nokta Şekli</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["square","rounded","extra-rounded","dots","classy","classy-rounded"] as DotType[]).map(d => (
                        <button key={d} type="button" onClick={()=>p("dotType",d)}
                          className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ${
                            cfg.dotType===d ? "border-violet-500 bg-violet-500/10 text-violet-400"
                              : dk?"border-white/[0.08] text-slate-500 hover:border-white/20":"border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                          <span className="text-base font-black">
                            {d==="square"?"▪":d==="rounded"?"●":d==="extra-rounded"?"⬬":d==="dots"?"•":d==="classy"?"◆":"◈"}
                          </span>
                          <span className="text-[10px] font-semibold">{
                            {square:"Kare",rounded:"Yuvarlak","extra-rounded":"Ekstra Y.",dots:"Nokta",classy:"Klasik","classy-rounded":"Kl.Yuv."}[d]
                          }</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Renk Modu</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${sub}`}>Gradient</span>
                        <Toggle on={cfg.useGradient} onChange={()=>p("useGradient",!cfg.useGradient)}/>
                      </div>
                    </div>

                    {cfg.useGradient ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          {(["linear","radial"] as const).map(gt => (
                            <button key={gt} type="button" onClick={()=>p("gradientType",gt)}
                              className={`flex-1 py-2 text-xs rounded-xl border font-semibold transition-all ${
                                cfg.gradientType===gt ? "border-violet-500 bg-violet-500/15 text-violet-400"
                                  : dk?"border-white/10 text-slate-500":"border-slate-200 text-slate-400"}`}>
                              {gt==="linear"?"Doğrusal":"Radyal"}
                            </button>
                          ))}
                        </div>
                        {cfg.gradientType==="linear" && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className={`text-[11px] ${sub}`}>Açı</p>
                              <span className={`text-[11px] font-mono font-bold ${dk?"text-violet-300":"text-violet-600"}`}>{cfg.gradientAngle}°</span>
                            </div>
                            <input type="range" min={0} max={360} step={5} value={cfg.gradientAngle}
                              onChange={e=>p("gradientAngle",Number(e.target.value))} className="w-full accent-violet-500"/>
                            <div className="flex justify-between mt-1">
                              {[0,45,90,135,180,225,270,315].map(a => (
                                <button key={a} type="button" onClick={()=>p("gradientAngle",a)}
                                  className={`text-[9px] px-1 py-0.5 rounded transition-colors ${cfg.gradientAngle===a?"text-violet-400 bg-violet-500/10":sub}`}>{a}°</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <ColorPicker label="Renk 1" val={cfg.color1} onChange={v=>p("color1",v)}/>
                          <ColorPicker label="Renk 2" val={cfg.color2} onChange={v=>p("color2",v)}/>
                        </div>
                        <div className="h-8 rounded-xl overflow-hidden border" style={{
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
                <div className="space-y-5">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Dış Çerçeve</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([{v:"square" as EyeFrameType,l:"Kare"},{v:"extra-rounded" as EyeFrameType,l:"Yuvarlak"},{v:"dot" as EyeFrameType,l:"Daire"}]).map(o => (
                        <button key={o.v} type="button" onClick={()=>p("eyeFrameType",o.v)}
                          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                            cfg.eyeFrameType===o.v ? "border-violet-500 bg-violet-500/10 text-violet-400"
                              : dk?"border-white/[0.08] text-slate-500 hover:border-white/20":"border-slate-200 text-slate-400"}`}>
                          <div className={`w-7 h-7 border-[3px] ${o.v==="dot"?"rounded-full":o.v==="extra-rounded"?"rounded-xl":"rounded-sm"}`}
                            style={{ borderColor:"currentColor" }}/>
                          <span className="text-[10px] font-semibold">{o.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>İç Nokta</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([{v:"square" as EyeDotType,l:"Kare"},{v:"dot" as EyeDotType,l:"Daire"}]).map(o => (
                        <button key={o.v} type="button" onClick={()=>p("eyeDotType",o.v)}
                          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                            cfg.eyeDotType===o.v ? "border-violet-500 bg-violet-500/10 text-violet-400"
                              : dk?"border-white/[0.08] text-slate-500 hover:border-white/20":"border-slate-200 text-slate-400"}`}>
                          <div className={`w-4 h-4 ${o.v==="dot"?"rounded-full":"rounded-sm"}`} style={{ background:"currentColor" }}/>
                          <span className="text-[10px] font-semibold">{o.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Özel Göz Rengi</p>
                      <Toggle on={cfg.useCustomEyeColor} onChange={()=>p("useCustomEyeColor",!cfg.useCustomEyeColor)}/>
                    </div>
                    {cfg.useCustomEyeColor
                      ? <ColorPicker label="Göz Rengi" val={cfg.eyeColor} onChange={v=>p("eyeColor",v)}/>
                      : <p className={`text-xs ${sub}`}>Nokta rengini otomatik kullanır.</p>
                    }
                  </div>
                </div>
              )}

              {/* COLORS */}
              {activePanel==="colors" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Arka Plan</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${sub}`}>Şeffaf</span>
                        <Toggle on={cfg.bgTransparent} onChange={()=>p("bgTransparent",!cfg.bgTransparent)}/>
                      </div>
                    </div>
                    {!cfg.bgTransparent && <ColorPicker label="Arka Plan Rengi" val={cfg.bgColor} onChange={v=>p("bgColor",v)}/>}
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Hazır Tema Renkleri</p>
                    <div className="grid grid-cols-4 gap-2">
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
                          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${dk?"border-white/[0.08] hover:border-white/20":"border-slate-200 hover:border-slate-300"}`}>
                          <div className="flex gap-0.5">
                            <div className="w-3.5 h-3.5 rounded-full border" style={{background:pr.dot,borderColor:"rgba(0,0,0,0.15)"}}/>
                            <div className="w-3.5 h-3.5 rounded-full border" style={{background:pr.bg,borderColor:"rgba(0,0,0,0.15)"}}/>
                          </div>
                          <span className={`text-[9px] font-semibold ${sub}`}>{pr.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Gradient Presetleri</p>
                    <div className="grid grid-cols-4 gap-2">
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
                          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${dk?"border-white/[0.08] hover:border-white/20":"border-slate-200 hover:border-slate-300"}`}>
                          <div className="w-8 h-4 rounded-md" style={{background:`linear-gradient(${g.a}deg,${g.c1},${g.c2})`}}/>
                          <span className={`text-[9px] font-semibold ${sub}`}>{g.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LOGO */}
              {activePanel==="logo" && (
                <div className="space-y-5">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${dk?"bg-white/[0.03] border-white/[0.07]":"bg-slate-50 border-slate-200"}`}>
                        <div className={`w-12 h-12 shrink-0 overflow-hidden relative border-2 bg-white ${
                          cfg.logoShape==="circle"?"rounded-full":cfg.logoShape==="rounded"?"rounded-xl":"rounded-sm"}`}
                          style={{borderColor:dk?"rgba(255,255,255,0.2)":"#e2e8f0"}}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logoPreview} alt="" className="w-full h-full object-contain p-0.5"/>
                          {logoLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={12} className="animate-spin text-white"/></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${tx}`}>{logo?.name}</p>
                          {logoData && !logoLoading && <p className="text-[10px] text-emerald-400 mt-0.5">✓ Uygulandı</p>}
                        </div>
                        <button onClick={()=>{setLogo(null);setLogoData(null);setLogoPreview(null);}} className={`${sub} hover:text-red-400 p-1`}><X size={14}/></button>
                      </div>

                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Çerçeve Şekli</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([{v:"circle" as LogoShape,l:"Daire",icon:<Circle size={15}/>},{v:"rounded" as LogoShape,l:"Yuvarlak",icon:<LayoutTemplate size={15}/>},{v:"square" as LogoShape,l:"Kare",icon:<Square size={15}/>}]).map(o=>(
                            <button key={o.v} type="button" onClick={()=>handleShapeChange(o.v)}
                              className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border transition-all ${
                                cfg.logoShape===o.v?"border-violet-500 bg-violet-500/15 text-violet-400"
                                  :dk?"border-white/10 text-slate-500 hover:border-white/20":"border-slate-200 text-slate-400"}`}>
                              {o.icon}<span className="text-[10px] font-semibold">{o.l}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Logo Boyutu</p>
                          <span className={`text-xs font-mono font-bold ${dk?"text-violet-300":"text-violet-600"}`}>%{Math.round(cfg.logoSize*100)}</span>
                        </div>
                        <input type="range" min={15} max={45} step={1} value={Math.round(cfg.logoSize*100)}
                          onChange={e=>handleSizeChange(Number(e.target.value)/100)} className="w-full accent-violet-500"/>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      dk?"border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5":"border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dk?"bg-white/5":"bg-slate-100"}`}>
                        <ImageIcon size={20} className="text-violet-400"/>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-semibold ${dk?"text-slate-300":"text-slate-600"}`}>Logo Yükle</p>
                        <p className={`text-[11px] mt-0.5 ${sub}`}>PNG, JPG, SVG · Otomatik çerçeveleme</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleLogoFile(f);}}/>
                    </label>
                  )}
                </div>
              )}

              {/* ADVANCED */}
              {activePanel==="advanced" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Kenar Boşluğu</p>
                      <span className={`text-xs font-mono font-bold ${dk?"text-violet-300":"text-violet-600"}`}>{cfg.margin}px</span>
                    </div>
                    <input type="range" min={0} max={60} step={4} value={cfg.margin}
                      onChange={e=>p("margin",Number(e.target.value))} className="w-full accent-violet-500"/>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Hata Düzeltme</p>
                    <div className="grid grid-cols-4 gap-2">
                      {([{l:"L",label:"Düşük",desc:"7%"},{l:"M",label:"Orta",desc:"15%"},{l:"Q",label:"İyi",desc:"25%"},{l:"H",label:"Yüksek",desc:"30%"}] as const).map(ec=>(
                        <button key={ec.l} type="button" onClick={()=>p("ecLevel",ec.l)}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                            cfg.ecLevel===ec.l?"border-violet-500 bg-violet-500/15 text-violet-400"
                              :dk?"border-white/[0.08] text-slate-500 hover:border-white/20":"border-slate-200 text-slate-400"}`}>
                          <span className="text-sm font-black">{ec.l}</span>
                          <span className="text-[9px] font-semibold">{ec.label}</span>
                          <span className={`text-[9px] ${sub}`}>{ec.desc}</span>
                        </button>
                      ))}
                    </div>
                    <p className={`text-[11px] mt-2 ${sub}`}>Logo eklendiğinde H veya Q önerilir.</p>
                  </div>

                  <div className={`h-px ${dk?"bg-white/[0.06]":"bg-slate-100"}`}/>

                  <button onClick={resetToNew}
                    className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm rounded-xl border transition-all ${dk?"border-white/10 text-slate-400 hover:border-red-500/30 hover:text-red-400":"border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500"}`}>
                    <RefreshCw size={13}/> Varsayılana Sıfırla
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className={`w-80 shrink-0 border-l flex flex-col ${dk?"border-white/[0.07] bg-[#09101e]":"border-slate-200 bg-white"}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dk?"border-white/[0.07]":"border-slate-200"}`}>
            <p className={`text-xs font-bold ${tx}`}>Canlı Önizleme</p>
            <button onClick={()=>setPreviewZoom(!previewZoom)}
              className={`p-1.5 rounded-lg transition-all ${dk?"text-slate-500 hover:text-violet-400 hover:bg-white/5":"text-slate-400 hover:text-violet-600"}`} title="Zoom">
              <ZoomIn size={13}/>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div className={`rounded-2xl border p-4 transition-all ${dk?"border-white/8 bg-white/[0.02]":"border-slate-200 bg-slate-50"}`}
              style={{ boxShadow: dk?"0 20px 60px rgba(0,0,0,0.5)":"0 20px 60px rgba(0,0,0,0.08)" }}>
              <LiveQR cfg={cfg} logo={logoData} size={previewZoom?260:220}/>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${dk?"border-white/10 text-slate-500 bg-white/[0.03]":"border-slate-200 text-slate-400"}`}>
                {cfg.dotType}
              </span>
              {cfg.useGradient && (
                <span className="text-[10px] px-2 py-1 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10 font-semibold">gradient</span>
              )}
              {logoData && (
                <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-semibold">logo ✓</span>
              )}
              <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${dk?"border-white/10 text-slate-500 bg-white/[0.03]":"border-slate-200 text-slate-400"}`}>
                EC:{cfg.ecLevel}
              </span>
            </div>
          </div>

          <div className={`p-4 space-y-2.5 border-t ${dk?"border-white/[0.07]":"border-slate-200"}`}>
            {editingId && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${dk?"bg-amber-500/10 border border-amber-500/20":"bg-amber-50 border border-amber-200"}`}>
                <span className="text-[10px] text-amber-400 font-semibold truncate">✎ {saveName}</span>
                <button onClick={resetToNew} className="text-amber-400/60 hover:text-amber-400 shrink-0"><X size={10}/></button>
              </div>
            )}
            <button onClick={()=>setShowSaveModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition-all">
              <Star size={13}/> {editingId?"Şablonu Güncelle":"Şablon Kaydet"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={exportPng} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border transition-all ${dk?"border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-300":"border-slate-200 text-slate-500 hover:border-violet-300"}`}>
                <Download size={11}/> PNG
              </button>
              <button onClick={exportSvg} className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border transition-all ${dk?"border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300":"border-slate-200 text-slate-500 hover:border-emerald-300"}`}>
                <Download size={11}/> SVG
              </button>
            </div>
            <p className={`text-[10px] text-center ${sub}`}>QR oluştururken şablon seçilebilir <ChevronRight size={9} className="inline"/></p>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowSaveModal(false)}/>
          <div className={`relative z-10 w-full max-w-sm border rounded-2xl p-6 shadow-2xl ${dk?"bg-[#0c0f1a] border-white/10":"bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Star size={15} className="text-white"/>
              </div>
              <div>
                <h3 className={`font-black text-base ${tx}`}>{editingId?"Şablonu Güncelle":"Şablon Kaydet"}</h3>
                <p className={`text-xs ${sub}`}>QR oluştururken seçilebilecek</p>
              </div>
            </div>
            <input autoFocus value={saveName} onChange={e=>setSaveName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&save()}
              placeholder="Örn: Mor Gradient Şablonum"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all mb-4 ${inp}`}/>
            <div className="flex gap-3">
              <button onClick={()=>setShowSaveModal(false)}
                className={`flex-1 py-2.5 text-sm border rounded-xl transition-colors ${dk?"border-white/10 text-slate-400 hover:text-slate-200":"border-slate-200 text-slate-500"}`}>
                İptal
              </button>
              <button onClick={save} disabled={!saveName.trim()||saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-50">
                {saving?<Loader2 size={13} className="animate-spin"/>:<Save size={13}/>}
                {editingId?"Güncelle":"Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

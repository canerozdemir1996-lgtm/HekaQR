"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Upload, Download, Save, RefreshCw, X, Loader2, Circle, Square, RectangleHorizontal } from "lucide-react";
import { createLogoMask, createLogoWithWhiteCircle } from "@/lib/logoMask";

type DotType = "square" | "rounded" | "extra-rounded" | "dots" | "classy" | "classy-rounded";
type EyeFrameType = "square" | "extra-rounded" | "dot";
type EyeDotType = "square" | "dot";
type LogoShape = "circle" | "square" | "rounded";

interface Config {
  url: string; size: number;
  dotType: DotType; dotColor: string;
  useGradient: boolean; gradientType: "linear" | "radial"; gradientAngle: number;
  color1: string; color2: string;
  eyeFrameType: EyeFrameType; eyeDotType: EyeDotType; eyeColor: string;
  bgColor: string; bgTransparent: boolean;
  margin: number; ecLevel: "L" | "M" | "Q" | "H";
  logoShape: LogoShape; logoSize: number; // logoSize: 0.2–0.45
}

const DEFAULT: Config = {
  url: "https://example.com", size: 380,
  dotType: "rounded", dotColor: "#0f172a",
  useGradient: false, gradientType: "linear", gradientAngle: 135,
  color1: "#6366f1", color2: "#ec4899",
  eyeFrameType: "extra-rounded", eyeDotType: "dot", eyeColor: "#0f172a",
  bgColor: "#ffffff", bgTransparent: false,
  margin: 16, ecLevel: "Q",
  logoShape: "circle", logoSize: 0.32,
};

export default function QRStudio({ initialUrl = "", onSave, theme = "dark" }: {
  initialUrl?: string; onSave?: (cfg: Config) => Promise<void>; theme?: "dark" | "light"
}) {
  const isDark = theme === "dark";
  const [cfg, setCfg] = useState<Config>({ ...DEFAULT, url: initialUrl || DEFAULT.url });
  const [logo, setLogo] = useState<File | null>(null);
  const [maskedLogo, setMaskedLogo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<unknown>(null);

  const p = useCallback(<K extends keyof Config>(k: K, v: Config[K]) => setCfg(prev => ({ ...prev, [k]: v })), []);

  const buildOptions = useCallback((c: Config, logoB64: string | null, size?: number) => {
    const sz = size ?? c.size;
    const dotOpts = c.useGradient
      ? { type: c.dotType, gradient: { type: c.gradientType, rotation: (c.gradientAngle * Math.PI) / 180, colorStops: [{ offset: 0, color: c.color1 }, { offset: 1, color: c.color2 }] } }
      : { type: c.dotType, color: c.dotColor };
    return {
      width: sz, height: sz, data: c.url || "https://example.com", margin: c.margin,
      qrOptions: { errorCorrectionLevel: c.ecLevel },
      image: logoB64 ?? undefined,
      imageOptions: { hideBackgroundDots: true, imageSize: c.logoSize, margin: 4 },
      dotsOptions: dotOpts,
      cornersSquareOptions: { type: c.eyeFrameType, color: c.eyeColor },
      cornersDotOptions: { type: c.eyeDotType, color: c.eyeColor },
      backgroundOptions: c.bgTransparent ? undefined : { color: c.bgColor },
    };
  }, []);

  // Track previous gradient state to force re-create on toggle
  const prevGradientRef = useRef(cfg.useGradient);

  useEffect(() => {
    if (!containerRef.current) return;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const opts = buildOptions(cfg, maskedLogo);
      const gradientChanged = prevGradientRef.current !== cfg.useGradient;
      prevGradientRef.current = cfg.useGradient;

      // Force full re-create when gradient is toggled (qr-code-styling bug: update() doesn't clear gradient)
      if (!qrRef.current || gradientChanged) {
        if (containerRef.current) containerRef.current.innerHTML = "";
        qrRef.current = new QRCodeStyling(opts);
        (qrRef.current as { append: (el: HTMLElement) => void }).append(containerRef.current!);
      } else {
        (qrRef.current as { update: (opts: unknown) => void }).update(opts);
      }
    });
  }, [cfg, maskedLogo, buildOptions]);

  // Re-apply logo mask when shape or size changes
  const applyLogoMask = useCallback(async (file: File, shape: LogoShape, size: number) => {
    setLogoLoading(true);
    try {
      const b64 = await createLogoMask({ source: file, canvasSize: 400, logoRatio: size * 2, shadowBlur: 8, shape });
      setMaskedLogo(b64);
    } catch { setMaskedLogo(null); }
    finally { setLogoLoading(false); }
  }, []);

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    await applyLogoMask(file, cfg.logoShape, cfg.logoSize);
  }, [cfg.logoShape, cfg.logoSize, applyLogoMask]);

  const handleShapeChange = useCallback(async (shape: LogoShape) => {
    p("logoShape", shape);
    if (logo) await applyLogoMask(logo, shape, cfg.logoSize);
  }, [logo, cfg.logoSize, p, applyLogoMask]);

  const handleLogoSizeChange = useCallback(async (size: number) => {
    p("logoSize", size);
    if (logo) await applyLogoMask(logo, cfg.logoShape, size);
  }, [logo, cfg.logoShape, p, applyLogoMask]);

  const exportPNG = useCallback(async () => {
    if (!qrRef.current) return;
    await (qrRef.current as { download: (o: object) => Promise<void> }).download({ name: "qrcode", extension: "png" });
  }, []);

  const exportSVG = useCallback(async () => {
    const { default: QRCodeStyling } = await import("qr-code-styling");
    let printLogo = maskedLogo;
    if (logo) { try { printLogo = await createLogoWithWhiteCircle({ source: logo }); } catch { /* keep */ } }
    const qr = new QRCodeStyling(buildOptions({ ...cfg, size: 3000 }, printLogo, 3000));
    await qr.download({ name: "qrcode-print", extension: "svg" });
  }, [cfg, logo, maskedLogo, buildOptions]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try { await onSave(cfg); setSaveMsg("✓ Kaydedildi"); }
    catch { setSaveMsg("✗ Hata"); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  }, [cfg, onSave]);

  // Theme
  const bg = isDark ? "bg-slate-950" : "bg-white";
  const panelBg = isDark ? "bg-slate-900/60 border-slate-800/60" : "bg-slate-50 border-slate-200";
  const text = isDark ? "text-slate-100" : "text-slate-900";
  const subtext = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const labelCls = `text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className={`rounded-xl border ${panelBg} p-4 space-y-3`}>
      <p className={labelCls}>{title}</p>
      {children}
    </div>
  );

  const ColorRow = ({ label, val, onChange }: { label: string; val: string; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${subtext}`}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={val} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-700 bg-transparent" />
        <input type="text" value={val} onChange={e => onChange(e.target.value)}
          className={`w-20 text-xs font-mono ${inputBg} rounded-lg px-2 py-1.5 ${text} outline-none focus:border-violet-500 border`} />
      </div>
    </div>
  );

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full transition-colors ${on ? "bg-violet-600" : isDark ? "bg-slate-700" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );

  const Chips = ({ options, val, onChange }: { options: { v: string; l: string }[]; val: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${val === o.v ? "border-violet-500 bg-violet-500/15 text-violet-300" : `${isDark ? "border-slate-700 text-slate-400 hover:border-slate-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}`}>
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`border-b ${isDark ? "border-slate-800/60 bg-slate-950/95" : "border-slate-200 bg-white/95"} px-6 py-3.5 flex items-center justify-between sticky top-0 backdrop-blur z-20`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <span className="text-white font-black text-xs">QR</span>
          </div>
          <span className="font-black text-sm tracking-tight">Tasarım Stüdyosu</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPNG} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border ${isDark ? "border-slate-700 hover:border-violet-500 hover:text-violet-400" : "border-slate-200 hover:border-violet-400 hover:text-violet-500"} transition-colors`}>
            <Download size={12} /> PNG
          </button>
          <button onClick={exportSVG} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border ${isDark ? "border-slate-700 hover:border-emerald-500 hover:text-emerald-400" : "border-slate-200 hover:border-emerald-400 hover:text-emerald-600"} transition-colors`}>
            <Download size={12} /> SVG 3000px
          </button>
          {onSave && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Kaydediliyor" : "Şablon Olarak Kaydet"}
            </button>
          )}
          {saveMsg && <span className={`text-xs ${saveMsg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{saveMsg}</span>}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-6xl mx-auto">
        {/* Controls */}
        <div className="w-full lg:w-80 xl:w-96 space-y-3 shrink-0">
          <Section title="Nokta Stili">
            <Chips val={cfg.dotType} onChange={v => p("dotType", v as DotType)}
              options={[{v:"square",l:"Kare"},{v:"rounded",l:"Yuvarlak"},{v:"extra-rounded",l:"Ekstra"},{v:"dots",l:"Nokta"},{v:"classy",l:"Klasik"},{v:"classy-rounded",l:"Klasik Y"}]} />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${subtext}`}>Gradient</span>
              <Toggle on={cfg.useGradient} onChange={v => p("useGradient", v)} />
            </div>
            {cfg.useGradient ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {(["linear","radial"] as const).map(t => (
                    <button key={t} onClick={() => p("gradientType", t)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${cfg.gradientType === t ? "border-violet-500 bg-violet-500/15 text-violet-300" : `${isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}`}>
                      {t === "linear" ? "Doğrusal" : "Radyal"}
                    </button>
                  ))}
                </div>
                {cfg.gradientType === "linear" && (
                  <div>
                    <span className={`text-xs ${subtext}`}>Açı: {cfg.gradientAngle}°</span>
                    <input type="range" min={0} max={360} value={cfg.gradientAngle} onChange={e => p("gradientAngle", Number(e.target.value))} className="w-full mt-1 accent-violet-500" />
                  </div>
                )}
                <ColorRow label="Renk 1" val={cfg.color1} onChange={v => p("color1", v)} />
                <ColorRow label="Renk 2" val={cfg.color2} onChange={v => p("color2", v)} />
              </div>
            ) : (
              <ColorRow label="Renk" val={cfg.dotColor} onChange={v => p("dotColor", v)} />
            )}
          </Section>

          <Section title="Göz Stili">
            <Chips val={cfg.eyeFrameType} onChange={v => p("eyeFrameType", v as EyeFrameType)}
              options={[{v:"square",l:"Kare"},{v:"extra-rounded",l:"Yuvarlak"},{v:"dot",l:"Nokta"}]} />
            <Chips val={cfg.eyeDotType} onChange={v => p("eyeDotType", v as EyeDotType)}
              options={[{v:"square",l:"Kare"},{v:"dot",l:"Nokta"}]} />
            <ColorRow label="Göz Rengi" val={cfg.eyeColor} onChange={v => p("eyeColor", v)} />
          </Section>

          <Section title="Arka Plan">
            <div className="flex items-center justify-between">
              <span className={`text-xs ${subtext}`}>Şeffaf Arka Plan</span>
              <Toggle on={cfg.bgTransparent} onChange={v => p("bgTransparent", v)} />
            </div>
            {!cfg.bgTransparent && <ColorRow label="Renk" val={cfg.bgColor} onChange={v => p("bgColor", v)} />}
            <div>
              <span className={`text-xs ${subtext}`}>Kenar Boşluğu: {cfg.margin}px</span>
              <input type="range" min={0} max={60} value={cfg.margin} onChange={e => p("margin", Number(e.target.value))} className="w-full mt-1 accent-violet-500" />
            </div>
            <div>
              <span className={`text-xs ${subtext}`}>Hata Düzeltme</span>
              <Chips val={cfg.ecLevel} onChange={v => p("ecLevel", v as Config["ecLevel"])}
                options={[{v:"L",l:"L"},{v:"M",l:"M"},{v:"Q",l:"Q"},{v:"H",l:"H (Logo için)"}]} />
            </div>
          </Section>

          {/* Logo with shape + size */}
          <Section title="Logo">
            {logoPreview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${cfg.logoShape === "circle" ? "rounded-full" : cfg.logoShape === "rounded" ? "rounded-xl" : "rounded-none"} bg-white border-2 border-slate-700 flex items-center justify-center overflow-hidden relative shrink-0`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="logo" className="w-8 h-8 object-contain" />
                    {logoLoading && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><RefreshCw size={11} className="animate-spin text-violet-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${text} truncate`}>{logo?.name}</p>
                    {maskedLogo && !logoLoading && <p className="text-xs text-emerald-400 mt-0.5">✓ Çerçeve uygulandı</p>}
                  </div>
                  <button onClick={() => { setLogo(null); setMaskedLogo(null); setLogoPreview(null); }}
                    className={`${subtext} hover:text-red-400 transition-colors`}><X size={14} /></button>
                </div>

                {/* Logo Shape */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${subtext} mb-2`}>Çerçeve Şekli</p>
                  <div className="flex gap-2">
                    {([
                      { v: "circle", l: "Daire", icon: <Circle size={14} /> },
                      { v: "square", l: "Kare", icon: <Square size={14} /> },
                      { v: "rounded", l: "Yuvarlatılmış", icon: <RectangleHorizontal size={14} /> },
                    ] as { v: LogoShape; l: string; icon: React.ReactNode }[]).map(opt => (
                      <button key={opt.v} onClick={() => handleShapeChange(opt.v)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all ${cfg.logoShape === opt.v ? "border-violet-500 bg-violet-500/15 text-violet-300" : `${isDark ? "border-slate-700 text-slate-400 hover:border-slate-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}`}>
                        {opt.icon}
                        <span className="text-[10px]">{opt.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Size */}
                <div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${subtext}`}>Logo Boyutu</span>
                    <span className={`text-xs font-mono ${subtext}`}>{Math.round(cfg.logoSize * 100)}%</span>
                  </div>
                  <input type="range" min={15} max={45} step={1} value={Math.round(cfg.logoSize * 100)}
                    onChange={e => handleLogoSizeChange(Number(e.target.value) / 100)}
                    className="w-full mt-1 accent-violet-500" />
                </div>
              </div>
            ) : (
              <label className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDark ? "border-slate-700 hover:border-violet-500 hover:bg-violet-500/5" : "border-slate-200 hover:border-violet-400 hover:bg-violet-50/50"}`}>
                <Upload size={17} className={subtext} />
                <span className={`text-xs ${subtext} text-center`}>Logo yükle<br /><span className={`${isDark ? "text-slate-600" : "text-slate-400"} text-[10px]`}>PNG, SVG, JPG · Otomatik çerçeveleme</span></span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
              </label>
            )}
          </Section>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col items-center justify-start gap-5 pt-2">
          <div className={`rounded-2xl border ${isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"} p-6 shadow-2xl`}>
            <div ref={containerRef} className="rounded-xl overflow-hidden"
              style={{ width: cfg.size, height: cfg.size, maxWidth: "min(100%, 460px)", maxHeight: "min(100%, 460px)" }} />
          </div>
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className={`text-xs ${subtext}`}>Önizleme Boyutu</span>
              <span className={`text-xs ${subtext}`}>{cfg.size}px</span>
            </div>
            <input type="range" min={200} max={500} step={20} value={cfg.size} onChange={e => p("size", Number(e.target.value))} className="w-full accent-violet-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={exportPNG} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? "bg-slate-800 hover:bg-slate-700 border-slate-700" : "bg-slate-100 hover:bg-slate-200 border-slate-200"} text-sm font-medium transition-colors`}>
              <Download size={13} /> PNG
            </button>
            <button onClick={exportSVG} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors">
              <Download size={13} /> SVG 3000px
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

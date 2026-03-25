"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Palette, Shapes, Image as ImageIcon, LayoutTemplate, 
  Download, Save, Undo, Sparkles, ChevronLeft, 
  Wand2, SlidersHorizontal, Check, Type
} from "lucide-react";
import { updateQrCode, getSupabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";

type Tab = "colors" | "shapes" | "logo" | "frame";

export default function QRStudio2026() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const supabase = getSupabase();

  const [activeTab, setActiveTab] = useState<Tab>("colors");
  const [isSaving, setIsSaving] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");

  // Stüdyo State'leri
  const [fgColor, setFgColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");
  const [gradient, setGradient] = useState(true);
  const [dotShape, setDotShape] = useState("rounded");
  const [frameShape, setFrameShape] = useState("modern");
  const [logoSize, setLogoSize] = useState(30);

  // Veritabanından mevcut tasarımı yükle
  useEffect(() => {
    if (!id) return;
    supabase.from("qr_codes").select("design_config").eq("id", id).single().then(({ data }) => {
      if (data?.design_config) {
        const d = data.design_config as any;
        if (d.fgColor) setFgColor(d.fgColor);
        if (d.bgColor) setBgColor(d.bgColor);
        if (d.gradient !== undefined) setGradient(d.gradient);
        if (d.dotShape) setDotShape(d.dotShape);
        if (d.frameShape) setFrameShape(d.frameShape);
        if (d.logoSize) setLogoSize(d.logoSize);
        if (d.logoUrl) setLogoUrl(d.logoUrl);
      }
    });
  }, [id, supabase]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const QRCodeStyling = require("qr-code-styling");
      qrCode.current = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "https://hekaqr.com/q/bahar-26",
        margin: 10,
        qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" }
      });
      if (qrRef.current) {
        qrRef.current.innerHTML = "";
        qrCode.current.append(qrRef.current);
      }
    }
  }, []);

  useEffect(() => {
    if (!qrCode.current) return;
    
    let dotsOptions: any = { type: dotShape, color: fgColor };
    if (gradient) {
      dotsOptions.gradient = {
        type: "linear",
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: fgColor },
          { offset: 1, color: "#4f46e5" }
        ]
      };
    }

    qrCode.current.update({
      dotsOptions,
      backgroundOptions: { color: bgColor },
      image: logoUrl || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
        imageSize: logoSize / 100,
      }
    });
  }, [fgColor, bgColor, gradient, dotShape, logoSize, logoUrl]);

  const handleSave = async () => {
    if (!id) return toast.error("Hata: URL'de QR ID bulunamadı.");
    setIsSaving(true);
    try {
      // Tasarım nesnesini QrPayload içerisindeki generic (veya any türünden) kurallar/tasarım objesine veriyoruz.
      // Not: Supabase tablonuzdaki "design_config" jsonb alanına kayıt yapılacaktır.
      await updateQrCode(id, {
        design_config: { fgColor, bgColor, gradient, dotShape, frameShape, logoSize, logoUrl }
      } as any); 
      
      toast.success("Tasarım başarıyla kaydedildi!");
    } catch (error) {
      console.error(error);
      toast.error("Kaydedilirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#030712] text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-violet-500/30">
      
      {/* ── AMBIENT BACKGROUND GLOWS ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-10 h-16 border-b border-white/10 bg-[#030712]/80 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Bahar Kampanyası 
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] uppercase tracking-wider font-black border border-emerald-500/20">Taslak</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">hekaqr.com/q/bahar-26</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/5">
            <Undo size={14} /> Geri Al
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all active:scale-95"
          >
            {isSaving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT: Toolbar (Tabs) */}
        <aside className="w-20 border-r border-white/10 bg-[#070b14]/50 backdrop-blur-xl flex flex-col items-center py-6 gap-4 shrink-0">
          <ToolButton icon={Palette} label="Renkler" active={activeTab === "colors"} onClick={() => setActiveTab("colors")} />
          <ToolButton icon={Shapes} label="Şekiller" active={activeTab === "shapes"} onClick={() => setActiveTab("shapes")} />
          <ToolButton icon={ImageIcon} label="Logo" active={activeTab === "logo"} onClick={() => setActiveTab("logo")} />
          <ToolButton icon={LayoutTemplate} label="Çerçeve" active={activeTab === "frame"} onClick={() => setActiveTab("frame")} />
        </aside>

        {/* MIDDLE: Settings Panel */}
        <section className="w-80 border-r border-white/10 bg-[#070b14]/30 backdrop-blur-xl flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-black text-white mb-6 tracking-tight">
              {activeTab === "colors" && "Renk Paleti"}
              {activeTab === "shapes" && "Desen & Şekil"}
              {activeTab === "logo" && "Marka Logosu"}
              {activeTab === "frame" && "Dış Çerçeve"}
            </h2>

            {/* Renk Ayarları */}
            {activeTab === "colors" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 flex gap-3 items-start">
                  <Wand2 className="text-violet-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-violet-100 mb-1">Yapay Zeka Renk Önerisi</p>
                    <p className="text-[10px] text-violet-300/70 mb-3 leading-relaxed">Sitenizin renklerine en uygun kontrast oranına sahip paleti otomatik uygulayalım.</p>
                    <button className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-[10px] font-bold shadow-md hover:bg-violet-400 transition-colors">
                      Uygula
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">QR Deseni (Foreground)</label>
                  <div className="flex gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer" />
                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-sm font-mono text-slate-300 outline-none focus:border-violet-500" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Arka Plan (Background)</label>
                  <div className="flex gap-2">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer" />
                    <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-sm font-mono text-slate-300 outline-none focus:border-violet-500" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm font-semibold text-slate-300">Akıllı Gradient</span>
                  <button onClick={() => setGradient(!gradient)} className={`w-10 h-6 rounded-full transition-colors relative ${gradient ? "bg-violet-500" : "bg-slate-700"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${gradient ? "left-5" : "left-1"}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Şekil Ayarları */}
            {activeTab === "shapes" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><SlidersHorizontal size={14} /> Nokta Tipi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <ShapeCard active={dotShape === "square"} onClick={() => setDotShape("square")} label="Keskin Kare" />
                    <ShapeCard active={dotShape === "rounded"} onClick={() => setDotShape("rounded")} label="Yumuşak" />
                    <ShapeCard active={dotShape === "dots"} onClick={() => setDotShape("dots")} label="Noktalı" />
                    <ShapeCard active={dotShape === "classy"} onClick={() => setDotShape("classy")} label="Klasik" />
                  </div>
                </div>
                
                <div className="h-px bg-white/10" />

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><LayoutTemplate size={14} /> Göz Çerçevesi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Mock options */}
                    {[1,2,3].map(i => (
                      <button key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all flex items-center justify-center">
                        <div className={`w-8 h-8 border-4 border-slate-400 ${i === 2 ? 'rounded-md' : i === 3 ? 'rounded-full' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Logo Ayarları */}
            {activeTab === "logo" && (
              <div className="space-y-6 animate-fade-in">
                <label className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative overflow-hidden">
                  {logoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-4 opacity-30" />
                      <button type="button" onClick={(e) => { e.preventDefault(); setLogoUrl(""); }} className="relative z-10 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg">
                        Logoyu Kaldır
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon size={20} className="text-slate-400 group-hover:text-violet-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-300">Logo Yükle</p>
                      <p className="text-[10px] text-slate-500">SVG, PNG veya JPG</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogoUrl(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Logo Boyutu</label>
                    <span className="text-xs text-violet-400 font-mono">%{logoSize}</span>
                  </div>
                  <input type="range" min="10" max="50" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-full accent-violet-500" />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 opacity-50 cursor-not-allowed" title="Premium özellik">
                  <span className="text-sm font-semibold text-slate-300">Arka Planı Temizle</span>
                  <div className="w-10 h-6 rounded-full bg-slate-800" />
                </div>
              </div>
            )}

            {/* Çerçeve Ayarları */}
            {activeTab === "frame" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                    <ShapeCard active={frameShape === "none"} onClick={() => setFrameShape("none")} label="Çerçevesiz" />
                    <ShapeCard active={frameShape === "modern"} onClick={() => setFrameShape("modern")} label="Modern Alt" />
                    <ShapeCard active={frameShape === "bubble"} onClick={() => setFrameShape("bubble")} label="Konuşma Balonu" />
                    <ShapeCard active={frameShape === "phone"} onClick={() => setFrameShape("phone")} label="Telefon Tarzı" />
                </div>

                {frameShape !== "none" && (
                  <div className="space-y-3 mt-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Type size={14} /> Çerçeve Metni</label>
                    <input 
                      type="text" 
                      placeholder="Örn: Taramak İçin Okut" 
                      defaultValue="Beni Tara!"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all" 
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        </section>

        {/* RIGHT: Live Preview Workspace */}
        <section className="flex-1 relative flex items-center justify-center p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')]">
          
          {/* Top Actions in Preview */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button 
              onClick={() => qrCode.current?.download({ name: "heka-qr", extension: "png" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-bold transition-all hover:scale-105"
            >
              <Download size={16} /> PNG İndir
            </button>
            <button 
              onClick={() => qrCode.current?.download({ name: "heka-qr", extension: "svg" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold transition-all hover:scale-105"
            >
              SVG
            </button>
          </div>

          {/* The QR Mock Preview Container (Glassmorphic) */}
          <div className="relative group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all duration-500" />
            
            <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transition-transform duration-500 hover:rotate-y-2 hover:-rotate-x-2">
              {/* Real QR Render Field */}
              <div 
                className="w-64 h-64 sm:w-80 sm:h-80 bg-white rounded-2xl flex items-center justify-center p-4 shadow-inner relative overflow-hidden"
              >
                <div 
                  ref={qrRef} 
                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>canvas]:w-full [&>canvas]:h-full transition-all duration-300"
                />
              </div>
              
              {/* Fake Frame Text */}
              {frameShape !== "none" && (
                <div className="mt-6 text-center">
                  <p className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                    Beni Tara!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Canlı Önizleme Aktif</span>
          </div>

        </section>

      </main>
    </div>
  );
}

// ── Yardımcı UI Bileşenleri ──

function ToolButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 w-16 p-2 rounded-2xl transition-all duration-300 ${
        active 
          ? "bg-violet-500/20 text-violet-300 shadow-[0_0_15px_rgba(124,58,237,0.2)]" 
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-violet-500 rounded-r-full" />}
      <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? "drop-shadow-md" : ""} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function ShapeCard({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-3 rounded-xl border text-left flex flex-col gap-2 transition-all duration-300 ${
        active 
          ? "bg-violet-500/10 border-violet-500 shadow-inner" 
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-400"
      }`}
    >
      {active && <Check size={14} className="absolute top-2 right-2 text-violet-400" />}
      <div className={`w-6 h-6 rounded-md ${active ? "bg-violet-400" : "bg-slate-600"}`} />
      <span className={`text-[10px] font-bold ${active ? "text-violet-200" : "text-slate-400"}`}>{label}</span>
    </button>
  );
}
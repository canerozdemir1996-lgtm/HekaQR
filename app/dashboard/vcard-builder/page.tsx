"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  User, Phone, Share2, Palette, Image as ImageIcon, 
  Save, Undo, Sparkles, ChevronLeft, Building2,
  MapPin, Mail, Globe, Check, LayoutTemplate, Camera
} from "lucide-react";
import { Html, PresentationControls, Environment, RoundedBox, ContactShadows } from "@react-three/drei";
import { updateQrCode, getSupabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import dynamic from "next/dynamic";

const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => mod.Canvas), { ssr: false });

type Tab = "profile" | "contact" | "social" | "design";

function VCardBuilderInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const toast = useToast();
  const supabase = getSupabase();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [isSaving, setIsSaving] = useState(false);

  // Mock VCard State
  const [vcard, setVcard] = useState({
    firstName: "Caner",
    lastName: "Özdemir",
    title: "Senior Product Designer",
    company: "HekaTech",
    bio: "Dijital dünyada iz bırakan, kullanıcı odaklı ve yenilikçi arayüzler tasarlıyorum.",
    phone: "+90 555 123 4567",
    email: "hello@hekaqr.com",
    website: "hekaqr.com",
    address: "Istanbul, TR",
    instagram: "@hekaqr",
    linkedin: "in/canerozdemir",
    twitter: "@hekaqr",
    template: "modern",
    accentColor: "#7c3aed",
    coverColor: "#0f172a",
    avatar: "",
    coverImage: ""
  });

  const handleUpdate = (field: string, value: string) => {
    setVcard(prev => ({ ...prev, [field]: value }));
  };

  // Mevcut vCard verisini yükle
  useEffect(() => {
    if (!id) return;
    supabase.from("qr_codes").select("vcard_data").eq("id", id).single().then(({ data }) => {
      if (data?.vcard_data) {
        setVcard(prev => ({ ...prev, ...(data.vcard_data as object) }));
      }
    });
  }, [id, supabase]);

  const handleSave = async () => {
    if (!id) return toast.error("Hata: URL'de QR ID bulunamadı.");
    setIsSaving(true);
    try {
      // "as any" ile TypeScript'in katı VCardData arayüzü kontrolünü esnetiyoruz
      await updateQrCode(id, { vcard_data: vcard as any });
      toast.success("vCard profiliniz başarıyla güncellendi!");
    } catch (error) {
      toast.error("Kaydedilirken bir sorun oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all";
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2";

  return (
    <div className="h-screen w-full bg-[#030712] text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-violet-500/30">
      
      {/* ── AMBIENT BACKGROUND GLOWS ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen" />
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
              Kişisel Dijital Kartvizit 
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] uppercase tracking-wider font-black border border-violet-500/20">vCard</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">hekaqr.com/card/caner-oz</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/5">
            <Undo size={14} /> Değişiklikleri Geri Al
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all active:scale-95"
          >
            {isSaving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? "Yayına Alınıyor..." : "Yayına Al & Kaydet"}
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT: Toolbar (Tabs) */}
        <aside className="w-20 border-r border-white/10 bg-[#070b14]/50 backdrop-blur-xl flex flex-col items-center py-6 gap-4 shrink-0">
          <ToolButton icon={User} label="Profil" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          <ToolButton icon={Phone} label="İletişim" active={activeTab === "contact"} onClick={() => setActiveTab("contact")} />
          <ToolButton icon={Share2} label="Sosyal" active={activeTab === "social"} onClick={() => setActiveTab("social")} />
          <ToolButton icon={Palette} label="Tasarım" active={activeTab === "design"} onClick={() => setActiveTab("design")} />
        </aside>

        {/* MIDDLE: Settings Panel */}
        <section className="w-80 md:w-96 border-r border-white/10 bg-[#070b14]/30 backdrop-blur-xl flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-black text-white mb-6 tracking-tight">
              {activeTab === "profile" && "Kişisel Profil"}
              {activeTab === "contact" && "İletişim Bilgileri"}
              {activeTab === "social" && "Sosyal Medya"}
              {activeTab === "design" && "Görünüm & Tema"}
            </h2>

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fade-in">
                {/* Photo Uploaders */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <span className={labelClass}>Profil Fotoğrafı</span>
                    <label className="flex flex-col items-center justify-center h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer group">
                      <Camera size={20} className="text-slate-500 group-hover:text-violet-400 mb-1 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-400">Yükle</span>
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className={labelClass}>Arkaplan (Kapak)</span>
                    <label className="flex flex-col items-center justify-center h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer group">
                      <ImageIcon size={20} className="text-slate-500 group-hover:text-violet-400 mb-1 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-400">Yükle</span>
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelClass}>Ad</label>
                    <input type="text" value={vcard.firstName} onChange={(e) => handleUpdate('firstName', e.target.value)} className={inputClass} placeholder="Örn: Ali" />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Soyad</label>
                    <input type="text" value={vcard.lastName} onChange={(e) => handleUpdate('lastName', e.target.value)} className={inputClass} placeholder="Örn: Yılmaz" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Ünvan / Pozisyon</label>
                  <input type="text" value={vcard.title} onChange={(e) => handleUpdate('title', e.target.value)} className={inputClass} placeholder="Örn: Kurucu Ortak" />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Şirket</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="text" value={vcard.company} onChange={(e) => handleUpdate('company', e.target.value)} className={`${inputClass} pl-11`} placeholder="Şirket Adı" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Hakkımda (Biyografi)</label>
                  <textarea value={vcard.bio} onChange={(e) => handleUpdate('bio', e.target.value)} rows={4} className={`${inputClass} resize-none`} placeholder="Kendinizden kısaca bahsedin..." />
                </div>
              </div>
            )}

            {/* CONTACT TAB */}
            {activeTab === "contact" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label className={labelClass}>Cep Telefonu</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="tel" value={vcard.phone} onChange={(e) => handleUpdate('phone', e.target.value)} className={`${inputClass} pl-11`} placeholder="+90 555 000 0000" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className={labelClass}>E-Posta Adresi</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="email" value={vcard.email} onChange={(e) => handleUpdate('email', e.target.value)} className={`${inputClass} pl-11`} placeholder="ornek@sirket.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Web Sitesi</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="url" value={vcard.website} onChange={(e) => handleUpdate('website', e.target.value)} className={`${inputClass} pl-11`} placeholder="https://siteniz.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Açık Adres / Konum</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3 text-slate-500" size={16} />
                    <textarea value={vcard.address} onChange={(e) => handleUpdate('address', e.target.value)} rows={3} className={`${inputClass} pl-11 resize-none`} placeholder="Ofis adresi veya şehir" />
                  </div>
                </div>
              </div>
            )}

            {/* SOCIAL TAB */}
            {activeTab === "social" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 mb-4">
                  <p className="text-xs text-violet-200/80 leading-relaxed">
                    Sosyal medya hesaplarınızı ekleyerek dijital kartvizitinizi tam bir iletişim merkezine dönüştürün.
                  </p>
                </div>

                <div className="space-y-4">
                  {["instagram", "linkedin", "twitter"].map((network) => (
                    <div key={network} className="space-y-2">
                      <label className={labelClass}>{network.charAt(0).toUpperCase() + network.slice(1)}</label>
                      <input 
                        type="text" 
                        value={vcard[network as keyof typeof vcard] as string} 
                        onChange={(e) => handleUpdate(network, e.target.value)} 
                        className={inputClass} 
                        placeholder={network === "linkedin" ? "in/kullaniciadi" : "@kullaniciadi"} 
                      />
                    </div>
                  ))}
                </div>
                
                <button className="w-full py-3 rounded-xl border border-dashed border-white/20 text-slate-400 text-xs font-bold hover:bg-white/5 hover:text-white transition-colors">
                  + Yeni Sosyal Medya Ekle
                </button>
              </div>
            )}

            {/* DESIGN TAB */}
            {activeTab === "design" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <label className={labelClass}><LayoutTemplate size={14} className="inline mr-1" /> Şablon Stili</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleUpdate('template', 'modern')} className={`p-4 rounded-2xl border text-left transition-all ${vcard.template === 'modern' ? 'bg-violet-500/10 border-violet-500 shadow-inner' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                      <div className="w-8 h-8 rounded-lg bg-slate-800 mb-2 border border-slate-700" />
                      <p className={`text-xs font-bold ${vcard.template === 'modern' ? 'text-violet-300' : 'text-slate-300'}`}>Modern Kart</p>
                    </button>
                    <button onClick={() => handleUpdate('template', 'minimal')} className={`p-4 rounded-2xl border text-left transition-all ${vcard.template === 'minimal' ? 'bg-violet-500/10 border-violet-500 shadow-inner' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 mb-2 border border-slate-300 mx-auto" />
                      <p className={`text-xs font-bold text-center ${vcard.template === 'minimal' ? 'text-violet-300' : 'text-slate-300'}`}>Minimal</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="space-y-2">
                    <label className={labelClass}>Vurgu Rengi (Accent)</label>
                    <div className="flex gap-3">
                      <input type="color" value={vcard.accentColor} onChange={(e) => handleUpdate('accentColor', e.target.value)} className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer shrink-0" />
                      <input type="text" value={vcard.accentColor} onChange={(e) => handleUpdate('accentColor', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className={labelClass}>Arkaplan / Kapak Rengi</label>
                    <div className="flex gap-3">
                      <input type="color" value={vcard.coverColor} onChange={(e) => handleUpdate('coverColor', e.target.value)} className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer shrink-0" />
                      <input type="text" value={vcard.coverColor} onChange={(e) => handleUpdate('coverColor', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* RIGHT: Live Preview Workspace */}
        <section className="flex-1 relative flex items-center justify-center p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')]">
          
          <div className="absolute top-6 right-6 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2 z-20 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Etkileşimli 3D Önizleme</span>
          </div>

          {/* REAL 3D Phone Shell with Fiber/Drei */}
          <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
            <Canvas camera={{ position: [0, 0, 7.5], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1} castShadow />
              <Environment preset="city" />
              
              <PresentationControls
                global
                rotation={[0, -0.15, 0]}
                polar={[-0.1, 0.2]}
                azimuth={[-0.5, 0.5]}
                config={{ mass: 2, tension: 400 }}
                snap={{ mass: 4, tension: 400 }}
              >
                <group position={[0, -0.2, 0]}>
                  {/* Phone Chassis */}
                  <RoundedBox args={[2.5, 5.0, 0.2]} radius={0.25} smoothness={8} castShadow receiveShadow>
                    <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
                  </RoundedBox>

                  {/* Screen Bezel Line (Darker inner border) */}
                  <RoundedBox args={[2.4, 4.9, 0.21]} radius={0.2} smoothness={8}>
                    <meshStandardMaterial color="#020617" roughness={0.5} />
                  </RoundedBox>

                  {/* Dynamic Island / Notch */}
                  <mesh position={[0, 2.25, 0.11]} rotation={[0, 0, Math.PI / 2]}>
                    <capsuleGeometry args={[0.07, 0.5, 4, 16]} />
                    <meshStandardMaterial color="#000000" roughness={0.1} />
                  </mesh>

                  {/* Camera Lens in Notch */}
                  <mesh position={[0.15, 2.25, 0.12]}>
                    <sphereGeometry args={[0.025, 16, 16]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0} metalness={1} />
                  </mesh>

                  {/* Screen HTML Projection */}
                  <Html
                    transform
                    wrapperClass="htmlScreen"
                    distanceFactor={1.55}
                    position={[0, 0, 0.106]}
                    style={{
                      width: '320px',
                      height: '650px',
                      borderRadius: '2rem',
                      overflow: 'hidden',
                      backgroundColor: '#0f172a',
                    }}
                  >
                    <div className="w-full h-full text-slate-200 overflow-y-auto custom-scrollbar flex flex-col font-sans relative" style={{ backgroundColor: '#0f172a' }}>
                      
                      {/* VCard Cover */}
                      <div className="h-32 relative shrink-0" style={{ backgroundColor: vcard.coverColor }}>
                        {/* Dynamic Curve Overlay */}
                        <div className="absolute -bottom-6 left-0 right-0 h-12 bg-[#0f172a]" style={{ clipPath: 'ellipse(100% 100% at 50% 100%)' }} />
                      </div>

                      {/* Avatar */}
                      <div className="px-6 relative -mt-12 z-10 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-[#0f172a] shadow-xl flex items-center justify-center text-3xl font-black text-white" style={{ background: `linear-gradient(135deg, ${vcard.accentColor}, #4f46e5)` }}>
                          {vcard.firstName?.[0] || ""}{vcard.lastName?.[0] || ""}
                        </div>
                        <h2 className="mt-3 text-xl font-black text-white text-center leading-tight">
                          {vcard.firstName} {vcard.lastName}
                        </h2>
                        <p className="text-sm font-semibold mt-1 text-center" style={{ color: vcard.accentColor }}>{vcard.title}</p>
                        {vcard.company && <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1"><Building2 size={12}/> {vcard.company}</p>}
                      </div>

                      {/* Bio */}
                      {vcard.bio && (
                        <div className="px-6 mt-6 text-center">
                          <p className="text-xs text-slate-300 leading-relaxed opacity-90">{vcard.bio}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="px-6 mt-6 flex gap-3">
                        <button className="flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-transform active:scale-95" style={{ backgroundColor: vcard.accentColor }}>
                          Rehbere Kaydet
                        </button>
                      </div>

                      {/* Contact List */}
                      <div className="px-6 mt-6 space-y-3 pb-12">
                        {vcard.phone && (
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-300">
                              <Phone size={16} />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Telefon</p>
                              <p className="text-sm font-semibold text-white">{vcard.phone}</p>
                            </div>
                          </div>
                        )}
                        
                        {vcard.email && (
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-300">
                              <Mail size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">E-Posta</p>
                              <p className="text-sm font-semibold text-white truncate">{vcard.email}</p>
                            </div>
                          </div>
                        )}

                        {/* Social Chips */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {vcard.instagram && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Instagram</span>}
                          {vcard.linkedin && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">LinkedIn</span>}
                          {vcard.twitter && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20">X (Twitter)</span>}
                        </div>
                      </div>

                    </div>
                  </Html>
                </group>
              </PresentationControls>
              
              {/* Alt Gölgelendirme (Zemin) */}
              <ContactShadows position={[0, -2.8, 0]} opacity={0.5} scale={12} blur={2.5} far={4} color="#000000" />
            </Canvas>
          </div>

        </section>

      </main>
    </div>
  );
}

export default function VCardBuilderStudio2026() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#030712] text-white">Stüdyo Yükleniyor...</div>}>
      <VCardBuilderInner />
    </Suspense>
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
"use client";

import { useRef } from "react";
import Link from "next/link";
import { Environment, Float, RoundedBox, PresentationControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import dynamic from "next/dynamic";
import {
  QrCode, Zap, BarChart3, Shield, Smartphone, ArrowRight,
  Globe, Shuffle, Check, Lock, Scan, Palette, LayoutDashboard, Command
} from "lucide-react";

const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => mod.Canvas), { ssr: false });

// ── 3D Abstract Glass QR Matrix ──
function AbstractQR() {
  const group = useRef<any>(null);
  
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  // Soyut bir QR deseni oluşturmak için rastgele dizilmiş küpler
  const cubes = [];
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      if (Math.random() > 0.25) { 
        const isHighlight = Math.random() > 0.8;
        cubes.push(
          <Float key={`${x}-${y}`} speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <RoundedBox args={[0.8, 0.8, 0.8]} position={[x * 1.05, y * 1.05, (Math.random() - 0.5) * 0.6]} radius={0.15} smoothness={4}>
              <meshPhysicalMaterial color={isHighlight ? "#a855f7" : "#4f46e5"} transmission={0.9} opacity={1} metalness={0.1} roughness={0.1} ior={1.5} thickness={1.5} clearcoat={1} clearcoatRoughness={0.1}/>
            </RoundedBox>
          </Float>
        );
      }
    }
  }
  return <group ref={group}>{cubes}</group>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200 overflow-x-hidden transition-colors duration-500">
      
      {/* 2026 Ambient Glow Effects (Açık ve Koyu mod uyumlu) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse-slow" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-10%] left-[20%] w-[800px] h-[800px] rounded-full bg-fuchsia-400/10 dark:bg-pink-600/5 blur-[150px] mix-blend-multiply dark:mix-blend-screen opacity-60" />
      </div>

      {/* 2026 Glassmorphism Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* NAVBAR: Sticky & Frosted Glass */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-[#030712]/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20 dark:shadow-violet-900/40 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <QrCode size={20} className="text-white drop-shadow-sm" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-800 dark:text-white">
              Heka<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">QR</span>
            </span>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-violet-600 dark:text-slate-400 dark:hover:text-white transition-colors">Özellikler</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-violet-600 dark:text-slate-400 dark:hover:text-white transition-colors">Nasıl Çalışır?</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="group flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 hover:border-violet-200 dark:border-white/10 dark:hover:border-violet-500/40 bg-white/50 hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-violet-500/10 text-slate-700 hover:text-violet-700 dark:text-slate-300 dark:hover:text-white transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md">
              Giriş Yap <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
      </div>
      </nav>

      {/* HERO SECTION: Neumorphism & Premium Typography */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-40 pb-20 md:pt-48 md:pb-32 text-center flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 mb-8 animate-fade-in shadow-sm">
          <Zap size={14} className="text-amber-500 dark:text-amber-400" /> Yeni Nesil AI-Destekli QR Motoru · 2026
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.05] mb-8 max-w-4xl text-slate-900 dark:text-white">
          QR Yönetiminde <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 dark:from-violet-400 dark:via-indigo-400 dark:to-purple-400">
            2026 Standartları
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          Dinamik yönlendirme, gerçek zamanlı A/B testleri, ileri düzey Meta Pixel analitiği ve 
          vCard landing sayfaları ile dönüşüm oranlarınızı zirveye taşıyın.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link href="/login"
            className="group relative flex items-center justify-center gap-3 px-8 py-4 w-full sm:w-auto text-base font-black rounded-2xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 active:scale-95 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(124,58,237,0.6)]">
            <span>Hemen Kullanmaya Başla</span>
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            {/* Shine effect inside button */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute -inset-x-full top-0 bottom-0 z-[-1] bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            </div>
          </Link>
          
          <a href="#features"
            className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto text-base font-bold rounded-2xl text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md">
            <LayoutDashboard size={18} className="text-slate-400 dark:text-slate-500" />
            Paneli İncele
          </a>
        </div>

        {/* Key Stats - Glassmorphism floating cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-24 w-full max-w-4xl">
          {[
            { value: "Sınırsız", label: "Dinamik QR", icon: <Command size={16}/> },
            { value: "<50ms", label: "Yönlendirme", icon: <Zap size={16}/> },
            { value: "8+", label: "QR Modeli", icon: <Palette size={16}/> },
            { value: "Anlık", label: "Analitik Data", icon: <BarChart3 size={16}/> }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-3xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] backdrop-blur-md shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-transform duration-300">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                {stat.icon}
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-white mb-1">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION: 2026 UI Grid System */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16 md:mb-24">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-4">Profesyonel Araçlar</p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Her Şey Tek Bir Yerde</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Büyüyen işletmeler ve ajanslar için ihtiyaç duyulan tüm gelişmiş barkod yönetim araçları.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <Zap size={22}/>, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "group-hover:border-amber-500/50", title: "Dinamik Bağlantılar", desc: "QR kodunu bastıktan sonra bile yönleneceği URL'yi saniyeler içinde değiştirin." },
            { icon: <Smartphone size={22}/>, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10", border: "group-hover:border-violet-500/50", title: "vCard Landing Page", desc: "Profesyonel şablonlarla dijital kartvizitinizi oluşturun. Tek tıkla rehbere kayıt.", badge: "PREMIUM" },
            { icon: <BarChart3 size={22}/>, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "group-hover:border-emerald-500/50", title: "Derin Analitik", desc: "Taramaları ülke, şehir, cihaz ve işletim sistemine göre gerçek zamanlı izleyin." },
            { icon: <Globe size={22}/>, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "group-hover:border-blue-500/50", title: "Meta Pixel Entegrasyonu", desc: "Kamerasıyla kodu okutan kullanıcıları Facebook reklamlarınızda hedefleyin." },
            { icon: <Shuffle size={22}/>, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-500/10", border: "group-hover:border-pink-500/50", title: "A/B Trafik Testi", desc: "Ziyaretçileri %50/%50 farklı sayfalara yönlendirerek hangi tasarımın sattığını bulun." },
            { icon: <Lock size={22}/>, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", border: "group-hover:border-rose-500/50", title: "Güvenlik & Şifreleme", desc: "Özel kampanyalarınızı şifreleyin, kişi limitleri koyun ve son kullanma tarihi belirleyin." },
          ].map((f, idx) => (
            <div key={idx} className={`group relative p-8 rounded-[2rem] bg-white/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:shadow-none transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:hover:bg-white/[0.05] ${f.border}`}>
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${f.bg} ${f.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  {f.icon}
                </div>
                {f.badge && (
                  <span className="px-3 py-1 text-[10px] font-black rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 tracking-widest uppercase">
                    {f.badge}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS: Timeline & Flow */}
      <section id="how-it-works" className="relative z-10 py-24 border-t border-b border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-slate-900 dark:text-white">15 Saniyede İlk Kodunuz Hazır</h2>
          
          <div className="flex flex-col md:flex-row gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-violet-200 via-indigo-200 to-violet-200 dark:from-white/5 dark:via-white/10 dark:to-white/5 z-[-1]" />
            
            {[
              { n: "1", title: "Oturum Açın", desc: "Hızlıca sisteme giriş yapın. Şifresiz giriş veya sosyal ağlar ile." },
              { n: "2", title: "Hedefi Seçin", desc: "URL, Wi-Fi, PDF veya Dijital Kartvizit... Modeli belirleyin ve renkleri markanıza uydurun." },
              { n: "3", title: "Hemen İndirin", desc: "Yüksek çözünürlüklü SVG veya PNG olarak çıktıyı alın. Analitik anında başlasın." }
            ].map((step, i) => (
              <div key={i} className="flex-1 text-center group">
                <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white dark:bg-[#0f1627] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-3">
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-500 to-indigo-600">{step.n}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium px-4 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA: Immersion */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-32 text-center">
        <div className="relative rounded-[3rem] p-12 md:p-20 overflow-hidden border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-[#0a0f1d]/60 backdrop-blur-2xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/10 dark:from-violet-600/10 dark:to-indigo-600/10 pointer-events-none" />
          
          <h2 className="relative z-10 text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white">Fark Yaratmaya Hazır mısın?</h2>
          <p className="relative z-10 text-lg text-slate-600 dark:text-slate-400 mb-10 font-medium max-w-xl mx-auto">Tüm limitleri kaldıran HekaQR yönetim paneliyle tanışın. Saniyeler içinde ilk kodunuzu oluşturun.</p>
          
          <div className="relative z-10 flex justify-center">
            <Link href="/login"
              className="group flex items-center gap-3 px-10 py-5 text-lg font-black rounded-2xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/20">
              Sisteme Giriş Yap
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER: Minimal 2026 Style */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#030712] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 text-violet-600 dark:text-white">
              <QrCode size={14} />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">HekaQR Platform</span>
          </div>
          
          <p className="text-sm font-medium text-slate-500 dark:text-slate-500">© 2026 Tüm hakları saklıdır · Next.js 15 App Router</p>
          
          <div className="flex gap-6">
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-violet-600 dark:text-slate-400 dark:hover:text-white transition-colors">Yönetim Paneli</Link>
          </div>
        </div>
      </footer>
      
    </div>
  );
}

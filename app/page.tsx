import Link from "next/link";
import {
  QrCode, Zap, BarChart3, Shield, Smartphone, ArrowRight,
  Globe, Shuffle, Check, Lock, Scan, Palette,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:"absolute", top:"-5%", left:"30%", width:"800px", height:"800px", borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)" }}/>
        <div style={{ position:"absolute", bottom:"10%", right:"10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%)" }}/>
        <div style={{ position:"absolute", top:"60%", left:"5%", width:"300px", height:"300px", borderRadius:"50%", background:"radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 65%)" }}/>
      </div>

      {/* NAV */}
      <nav className="relative max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
            <QrCode size={17} className="text-white"/>
          </div>
          <span className="font-black text-xl tracking-tight">
            QR<span style={{ background:"linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Hub</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#features" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
            Özellikler
          </a>
          <Link href="/login"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/5 transition-all">
            Giriş Yap <ArrowRight size={13}/>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative max-w-5xl mx-auto px-8 pt-20 pb-24 text-center">
        <div style={{ border:"1px solid rgba(124,58,237,0.3)", background:"rgba(124,58,237,0.08)" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-purple-300 mb-8">
          <Zap size={11}/> Dinamik QR · A/B Test · Meta Pixel · vCard Landing Page
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
          QR Kodlarınızı<br/>
          <span style={{ background:"linear-gradient(120deg,#a78bfa 0%,#818cf8 50%,#c4b5fd 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Zekice Yönetin
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Tarama istatistikleri, Meta Pixel entegrasyonu, dijital kartvizitler ve A/B test.
          Tek platformda güçlü QR yönetimi.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link href="/login"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow:"0 20px 60px rgba(124,58,237,0.35)" }}
            className="flex items-center gap-2.5 px-8 py-4 text-base font-black rounded-2xl text-white transition-all hover:opacity-90">
            Giriş Yap <ArrowRight size={16}/>
          </Link>
          <a href="#features"
            style={{ border:"1px solid rgba(255,255,255,0.1)" }}
            className="flex items-center gap-2 px-7 py-4 text-sm font-semibold rounded-2xl text-slate-300 hover:text-white hover:border-white/20 transition-all">
            Özellikleri Keşfet
          </a>
        </div>
        <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
          {[["∞","Sınırsız QR"],["<50ms","Yönlendirme"],["8+","QR Tipi"],["Gerçek Zamanlı","Analitik"]].map(([v,l]) => (
            <div key={l} className="text-center">
              <div style={{ background:"linear-gradient(120deg,#a78bfa,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}
                className="text-2xl font-black">{v}</div>
              <div className="text-xs text-slate-600 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative max-w-6xl mx-auto px-8 py-24">
        <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Özellikler</p>
        <h2 className="text-4xl font-black text-center mb-3">Her şey dahil</h2>
        <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">Tek platformda ihtiyacınız olan tüm QR araçları.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon:<Smartphone size={20}/>, color:"#8b5cf6", title:"vCard Dijital Kartvizit", desc:"5 profesyonel şablon. Renk özelleştirme, sosyal medya, tek dokunuşla rehbere kaydet.", badge:"YENİ" },
            { icon:<Zap size={20}/>,        color:"#f59e0b", title:"Dinamik QR",               desc:"URL'yi istediğiniz zaman değiştirin. Baskı sonrası bile güncelleme yapın." },
            { icon:<BarChart3 size={20}/>,  color:"#10b981", title:"Gelişmiş Analitik",         desc:"Cihaz, OS, günlük tarama grafikleri. 30 günlük trend analizi." },
            { icon:<Shuffle size={20}/>,    color:"#6366f1", title:"A/B Test",                  desc:"İki URL arasında ağırlıklı trafik bölme. Hangi sayfanın daha iyi dönüştürdüğünü ölçün." },
            { icon:<Globe size={20}/>,      color:"#3b82f6", title:"Meta Pixel",                desc:"Facebook kampanyalarınızı QR taramalarıyla bağlayın. Otomatik ViewContent eventi." },
            { icon:<Shield size={20}/>,     color:"#ef4444", title:"Güvenlik & Kurallar",       desc:"Şifre, tarama limiti, bitiş tarihi. 301/302 yönlendirme, tam kontrol." },
            { icon:<Palette size={20}/>,    color:"#ec4899", title:"QR Şablonları",             desc:"Nokta şekilleri, gradient renkler, logo. Şablon oluşturun ve QR'lara uygulayın." },
            { icon:<Lock size={20}/>,       color:"#14b8a6", title:"Şifre Koruması",            desc:"QR kodlarınıza şifre ekleyin. Sadece yetkili kişiler erişebilsin." },
            { icon:<Scan size={20}/>,       color:"#f97316", title:"Toplu Yükleme",             desc:"CSV ile yüzlerce QR kodunu tek seferde oluşturun. Toplu PNG indirme." },
          ].map(f => (
            <div key={f.title}
              style={{ border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}
              className="group p-6 rounded-2xl hover:border-white/[0.12] hover:bg-white/[0.03] transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:`${f.color}15`, color:f.color }}>
                  {f.icon}
                </div>
                {f.badge && (
                  <span style={{ background:`${f.color}20`, color:f.color, border:`1px solid ${f.color}30` }}
                    className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{f.badge}</span>
                )}
              </div>
              <h3 className="font-bold text-sm mb-2 text-white">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative max-w-4xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-black text-center mb-14">15 saniyede ilk QR kodunuz</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n:"01", title:"Giriş Yapın",    desc:"Hesabınızla giriş yapın. Admin tarafından sağlanan erişim bilgileriyle." },
            { n:"02", title:"Özelleştirin",   desc:"URL, vCard, WiFi, WhatsApp — 8 farklı QR tipi. Tasarım ve kuralları ayarlayın." },
            { n:"03", title:"Yayınlayın",     desc:"QR kodunuz anında hazır. PNG veya SVG indirin, taramaları takip edin." },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.1))", border:"1px solid rgba(124,58,237,0.2)" }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span style={{ background:"linear-gradient(135deg,#a78bfa,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}
                  className="font-black text-lg">{s.n}</span>
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-3xl mx-auto px-8 py-20">
        <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.08))", border:"1px solid rgba(124,58,237,0.18)" }}
          className="p-12 rounded-3xl text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow:"0 20px 40px rgba(124,58,237,0.4)" }}>
            <QrCode size={28} className="text-white"/>
          </div>
          <h2 className="text-4xl font-black mb-4">Hemen Başlayın</h2>
          <p className="text-slate-400 mb-8 text-lg">Hesabınıza giriş yapın ve ilk QR kodunuzu oluşturun.</p>
          <Link href="/login"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow:"0 20px 60px rgba(124,58,237,0.4)" }}
            className="inline-flex items-center gap-2.5 px-10 py-4 font-black rounded-2xl text-white text-base transition-all hover:opacity-90">
            Giriş Yap <ArrowRight size={16}/>
          </Link>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-8">
            {["Sınırsız QR kodu","Gerçek zamanlı analitik","Meta Pixel entegrasyonu","vCard landing page"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Check size={9} className="text-violet-400"/>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }} className="py-8">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }} className="w-6 h-6 rounded-lg flex items-center justify-center">
              <QrCode size={11} className="text-white"/>
            </div>
            <span className="text-xs text-slate-600 font-bold">QR Hub</span>
          </div>
          <p className="text-xs text-slate-700">© 2025 QR Hub · Next.js 15 + Supabase</p>
          <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Giriş Yap →</Link>
        </div>
      </footer>
    </div>
  );
}

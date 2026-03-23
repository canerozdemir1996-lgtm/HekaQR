"use client";
import { useState, useEffect } from "react";
import { Loader2, QrCode, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [error,     setError]     = useState("");

  // Zaten giriş yapmışsa direkt yönlendir
  useEffect(() => {
    try {
      getSupabase().auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Herkesi dashboard'a yönlendir (admin de dahil)
          window.location.href = "/dashboard";
        } else {
          setChecking(false);
        }
      }).catch(() => { setChecking(false); });
    } catch {
      setChecking(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const sb = getSupabase();
      const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message.includes("Invalid login credentials") || authError.message.includes("invalid_credentials"))
          throw new Error("E-posta veya şifre hatalı.");
        if (authError.message.includes("Email not confirmed"))
          throw new Error("E-posta adresiniz henüz doğrulanmamış.");
        if (authError.message.includes("Database error") || authError.message.includes("fetch"))
          throw new Error("Sunucu bağlantı hatası. .env.local dosyanızdaki Supabase bilgilerini kontrol edin.");
        throw new Error(authError.message);
      }
      const must = !!data.user?.user_metadata?.must_change_password;
      if (must) { window.location.href = "/auth/force-change"; return; }
      // Herkesi dashboard'a yönlendir
      window.location.href = "/dashboard";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Giriş başarısız";
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
        setError("Sunucuya bağlanılamadı. Lütfen .env.local dosyanızı kontrol edin:\n- NEXT_PUBLIC_SUPABASE_URL\n- NEXT_PUBLIC_SUPABASE_ANON_KEY");
      } else if (msg.includes("env")) {
        setError(".env.local dosyası eksik veya Supabase bilgileri yanlış.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-violet-400"/>
          <p className="text-sm text-slate-400 animate-pulse">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* 2026: Animated background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/20 blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-500/20 to-violet-600/20 blur-3xl animate-float" style={{animationDelay: "2s"}}></div>
      </div>

      <div className="relative w-full max-w-sm">
        {/* 2026: Logo with enhanced animation */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <Link href="/" className="flex flex-col items-center group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30 mb-4 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-glow-primary"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <QrCode size={30} className="text-white transition-transform duration-300 group-hover:rotate-12"/>
            </div>
            <span className="font-black text-2xl text-white tracking-tight">
              QR<span style={{ background: "linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hub</span>
            </span>
          </Link>
          <p className="text-slate-500 text-sm mt-2 transition-colors duration-300 group-hover:text-slate-300">Hesabınıza giriş yapın</p>
        </div>

        {/* 2026: Glassmorphism Card - Premium effect */}
        <div className="rounded-2xl p-6 backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl shadow-violet-500/20 animate-fade-in transition-all duration-300 hover:border-white/20 hover:shadow-violet-500/30">
          <form onSubmit={handleLogin} className="space-y-4">

            {/* 2026: Error Alert - Glassmorphism + smooth animation */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-red-300 text-sm backdrop-blur-md animate-fade-in transition-all duration-300"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertCircle size={15} className="shrink-0 mt-0.5 flex-shrink-0"/>
                <span style={{ whiteSpace: "pre-line" }}>{error}</span>
              </div>
            )}

            {/* 2026: Email Input - Glassmorphism + focus glow */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">E-posta</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus placeholder="ornek@sirket.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-300
                  bg-white/5 backdrop-blur-md border border-white/10
                  text-white placeholder:text-slate-600
                  hover:bg-white/8 hover:border-white/15
                  focus:bg-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* 2026: Password Input - Glassmorphism + visibility toggle animation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all duration-300
                    bg-white/5 backdrop-blur-md border border-white/10
                    text-white placeholder:text-slate-600
                    hover:bg-white/8 hover:border-white/15
                    focus:bg-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all duration-300 hover:scale-110 active:scale-95">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* 2026: Remember Me Checkbox - Modern style with animation */}
            <label className="flex items-center gap-2.5 cursor-pointer group select-none transition-all duration-300">
              <div onClick={() => setRememberMe(!rememberMe)}
                className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110 active:scale-95"
                style={{ 
                  background: rememberMe 
                    ? "linear-gradient(135deg,#7c3aed,#4f46e5)" 
                    : "rgba(255,255,255,0.05)", 
                  border: rememberMe 
                    ? "none" 
                    : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: rememberMe ? "0 0 12px rgba(124,58,237,0.4)" : "none"
                }}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="animate-fade-in">
                    <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">Beni hatırla</span>
            </label>

            {/* 2026: Submit Button - Gradient + Glow + Micro-interactions */}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300 
                disabled:opacity-40 disabled:cursor-not-allowed mt-1
                bg-gradient-to-r from-violet-500 to-indigo-600
                hover:from-violet-400 hover:to-indigo-500
                active:from-violet-600 active:to-indigo-700
                hover:scale-105 active:scale-95
                shadow-lg shadow-violet-500/50 hover:shadow-violet-500/80 hover:shadow-2xl
                focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin"/> Giriş yapılıyor…</>
                : <><span>Giriş Yap</span><ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1"/></>
              }
            </button>
          </form>
        </div>

        {/* 2026: Footer - Enhanced links with hover effects */}
        <div className="flex items-center justify-between mt-5 px-1">
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-300 transition-all duration-300 hover:scale-110 focus:ring-2 focus:ring-violet-500">← Ana Sayfa</Link>
          <p className="text-xs text-slate-700">Hesap için admini arayın</p>
        </div>
      </div>
    </div>
  );
}

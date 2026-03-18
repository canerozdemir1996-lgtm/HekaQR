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
          const role = session.user.user_metadata?.role;
          window.location.href = (role === "admin" || role === "owner") ? "/admin" : "/dashboard";
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
      const role = data.user?.user_metadata?.role;
      window.location.href = (role === "admin" || role === "owner") ? "/admin" : "/dashboard";
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
        <Loader2 size={20} className="animate-spin text-violet-400"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 relative overflow-hidden">

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30 mb-4 transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <QrCode size={30} className="text-white"/>
            </div>
            <span className="font-black text-2xl text-white tracking-tight">
              QR<span style={{ background: "linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hub</span>
            </span>
          </Link>
          <p className="text-slate-500 text-sm mt-2">Hesabınıza giriş yapın</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 surface">
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-red-400 text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={15} className="shrink-0 mt-0.5"/>
                <span style={{ whiteSpace: "pre-line" }}>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">E-posta</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus placeholder="ornek@sirket.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-premium"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-premium"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <div onClick={() => setRememberMe(!rememberMe)}
                className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all"
                style={{ background: rememberMe ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.05)", border: rememberMe ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Beni hatırla</span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1 btn-premium focus-premium">
              {loading
                ? <><Loader2 size={15} className="animate-spin"/> Giriş yapılıyor…</>
                : <><span>Giriş Yap</span><ArrowRight size={14}/></>
              }
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-between mt-5 px-1">
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">← Ana Sayfa</Link>
          <p className="text-xs text-slate-700">Hesap için admini arayın</p>
        </div>
      </div>
    </div>
  );
}

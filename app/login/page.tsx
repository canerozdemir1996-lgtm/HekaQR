"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const session = await response.json();
          if (session?.user) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        //
      }
      setChecking(false);
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-posta veya şifre hatalı.");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
      }
    } catch {
      setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      await signIn(provider, { redirect: true, callbackUrl: "/dashboard" });
    } catch {
      setError(`${provider} ile giriş başarısız.`);
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center transition-colors duration-500">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full animate-[spin_3s_linear_infinite]" style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }} />
            <div className="absolute inset-2 border-4 border-cyan-500/20 rounded-full animate-[spin_2s_linear_infinite_reverse]" style={{ borderBottomColor: 'transparent', borderRightColor: 'transparent' }} />
            <Loader2 size={36} className="animate-spin text-violet-500" />
          </div>
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sisteme Bağlanılıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500 selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200">
      
      {/* Mission Control Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/20 dark:bg-violet-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-400/20 dark:bg-cyan-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" />
      </div>
      {/* Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.04]" 
           style={{ backgroundImage: 'linear-gradient(rgba(124, 58, 237, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 sm:mb-12 animate-fade-in">
          <Link href="/" className="flex flex-col items-center group outline-none rounded-[2rem] focus-visible:ring-4 focus-visible:ring-violet-500/50">
            <div className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.3)] mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 bg-gradient-to-br from-violet-500 to-indigo-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}/>
              <QrCode size={40} className="text-white relative z-10 drop-shadow-md" strokeWidth={2.5} />
            </div>
            <span className="font-black text-4xl text-slate-900 dark:text-white tracking-tight transition-colors">
              Heka<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-500">QR</span>
            </span>
          </Link>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.25em] mt-3">Mission Control</p>
        </div>

        {/* Form Container */}
        <div className="rounded-[2.5rem] p-8 sm:p-10 backdrop-blur-3xl bg-white/70 dark:bg-[#0b1121]/80 border border-slate-200/50 dark:border-white/10 shadow-2xl shadow-violet-500/10 dark:shadow-black/50 relative overflow-hidden group animate-scale-in" style={{ animationDelay: '150ms' }}>
          <div className="absolute -inset-x-full top-0 bottom-0 z-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Oturum Aç</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">Yönetim paneline erişim sağla.</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 px-5 py-4 rounded-[1.5rem] text-rose-600 dark:text-rose-300 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 shadow-sm animate-fade-in">
                <AlertCircle size={18} className="shrink-0 mt-0.5" strokeWidth={2.5}/>
                <span className="leading-relaxed font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2">KİMLİK (E-POSTA)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                autoFocus
                required
                disabled={loading}
                  className="w-full rounded-[1.5rem] px-5 py-4 text-sm font-bold outline-none transition-all duration-300
                    bg-white/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-white/10
                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600
                    focus:bg-white dark:focus:bg-[#0f1627] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              />
            </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2">GÜVENLİK ANAHTARI (ŞİFRE)</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                    className="w-full rounded-[1.5rem] px-5 py-4 pr-12 text-sm font-bold outline-none transition-all duration-300
                      bg-white/50 dark:bg-[#020617]/50 border border-slate-200 dark:border-white/10
                      text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600
                      focus:bg-white dark:focus:bg-[#0f1627] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20
                      disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 dark:text-slate-500 dark:hover:text-violet-400 transition-all hover:scale-110 active:scale-95"
                >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

              <div className="flex items-center justify-end text-xs font-bold">
                <Link href="/auth/reset" className="text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                Şifremi Unuttum →
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black text-base text-white transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed mt-2
                  bg-gradient-to-r from-violet-600 to-indigo-600
                  hover:from-violet-500 hover:to-indigo-500
                  hover:shadow-[0_15px_30px_-10px_rgba(124,58,237,0.5)] active:scale-95
                  relative overflow-hidden"
            >
              {loading ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    Bağlantı Kuruluyor...
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                    <ArrowRight size={18} strokeWidth={2.5}/>
                </>
              )}
            </button>
          </form>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">VEYA</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-bold text-sm text-slate-700 dark:text-white transition-all duration-300
                  bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10
                  hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-lg
                  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                  focus:ring-4 focus:ring-slate-200 dark:focus:ring-white/10"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
                Google ile Bağlan
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-bold text-sm text-slate-700 dark:text-white transition-all duration-300
                  bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10
                  hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-lg
                  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                  focus:ring-4 focus:ring-slate-200 dark:focus:ring-white/10"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900 dark:text-white">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
                GitHub ile Bağlan
            </button>
          </div>
          </div>

          <p className="text-center text-xs font-medium text-slate-500 mt-8">
            Şifrenizi unuttuysanız sistem yöneticisiyle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}

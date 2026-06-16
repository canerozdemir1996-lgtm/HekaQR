"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, QrCode, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import dynamic from "next/dynamic";

// Login sayfasında var olan Three.js küre arka planını burada da kullanıyoruz
const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Kayıt API'nize istek atıyoruz
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Kayıt sırasında bir hata oluştu.");
        setLoading(false);
        return;
      }

      // Kayıt başarılıysa
      setSuccess("Hesabınız başarıyla oluşturuldu. Yönlendiriliyorsunuz...");
      
      // Otomatik login yap
      setTimeout(async () => {
        await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
      }, 1500);

    } catch {
      setError("Sunucuyla bağlantı kurulamadı.");
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      await signIn(provider, { redirect: true, callbackUrl: "/dashboard" });
    } catch {
      setError(`${provider} ile kayıt başarısız.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex items-center justify-center p-4 transition-colors duration-300 selection:bg-violet-500/30 dark:selection:bg-white/20 relative overflow-hidden">
      
      {/* 3D Arka Plan */}
      <ThreeBackground isDark={isDark} />
      
      <div className="w-full max-w-[420px] relative z-10 animate-fade-in py-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-105 group-hover:rotate-3">
              <QrCode size={24} className="text-white" />
            </div>
          </Link>
        </div>

        {/* Form Container (Glassmorphism) */}
        <div className="bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-3xl border border-gray-200/50 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Yeni Hesap Oluştur</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Hemen başlayın, 14 gün ücretsiz deneyin.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <AlertCircle size={16} className="shrink-0"/>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 size={16} className="shrink-0"/>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 block">Ad Soyad</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adınız Soyadınız" required disabled={loading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors font-medium bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 block">E-posta</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" required disabled={loading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors font-medium bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 block">Şifre</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" required minLength={6} disabled={loading}
                    className="w-full rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors font-medium bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50" />
                  <button type="button" onClick={() => setShowPw(!showPw)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !email || !password || !fullName}
                className="w-full group relative flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                {loading ? <><Loader2 size={16} className="animate-spin relative z-10" /> <span className="relative z-10">Oluşturuluyor...</span></> : (
                  <><span className="relative z-10">Kayıt Ol</span> <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6 opacity-60">
              <div className="flex-1 h-px bg-gray-300 dark:bg-white/10" />
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">veya</span>
              <div className="flex-1 h-px bg-gray-300 dark:bg-white/10" />
            </div>

            <div className="space-y-3">
              <button type="button" onClick={() => handleOAuthSignIn("google")} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 hover:-translate-y-0.5 shadow-sm disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google ile Kayıt Ol
              </button>

              <button type="button" onClick={() => handleOAuthSignIn("github")} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 hover:-translate-y-0.5 shadow-sm disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 dark:text-white">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub ile Kayıt Ol
              </button>
            </div>

            <p className="text-center text-xs font-medium text-gray-500 mt-6">
              Zaten bir hesabınız var mı?{" "}
              <Link href="/login" className="text-violet-600 dark:text-violet-400 font-bold hover:underline transition-colors">
                Giriş Yapın
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

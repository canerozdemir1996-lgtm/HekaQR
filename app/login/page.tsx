"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import dynamic from "next/dynamic";
import BrandLogo from "@/components/BrandLogo";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [theme] = useTheme();
  const isDark = theme === "dark";

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
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
          <p className="text-sm font-medium text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex items-center justify-center p-4 transition-colors duration-300 selection:bg-gray-200 dark:selection:bg-white/20 relative overflow-hidden">
      <ThreeBackground isDark={isDark} />
      <div className="w-full max-w-[400px] relative z-10 animate-fade-in">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center justify-center outline-none">
            <BrandLogo priority className="w-[220px] sm:w-[240px]" width={420} height={134} />
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-2xl border border-gray-200/50 dark:border-[#333]/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Oturum Aç</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Yönetim paneline devam edin.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <AlertCircle size={16} className="shrink-0"/>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                autoFocus
                required
                disabled={loading}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors
                  bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333]
                  text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600
                  focus:border-black dark:focus:border-white disabled:opacity-50"
              />
            </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors
                    bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333]
                    text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600
                    focus:border-black dark:focus:border-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end text-xs font-medium">
              <Link href="/auth/reset" className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                Şifremi Unuttum →
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors mt-2
                bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200
                disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-[#333]" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">veya</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-[#333]" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors
                bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white
                hover:bg-gray-50 dark:hover:bg-[#1a1a1a] shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google ile Devam Et
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors
                bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white
                hover:bg-gray-50 dark:hover:bg-[#1a1a1a] shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 dark:text-white">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub ile Devam Et
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Şifrenizi unuttuysanız sistem yöneticisiyle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

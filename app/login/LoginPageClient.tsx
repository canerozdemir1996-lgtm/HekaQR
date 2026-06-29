<<<<<<< ours
﻿"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
=======
"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Sparkles, TrendingUp } from "lucide-react";
>>>>>>> theirs
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import dynamic from "next/dynamic";
import BrandLogo from "@/components/BrandLogo";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });

<<<<<<< ours
=======
const statBars = [38, 54, 46, 70, 60, 86, 100, 78];

const qrPattern = [
  "11100110100111",
  "10110100101101",
  "11100011100011",
  "00110100110100",
  "11101011101011",
  "10011001011001",
  "01100111100110",
  "11010011010011",
  "10101100101101",
  "11100011100111",
  "01011010011010",
  "11001101001101",
  "10110111100101",
  "11100100111100",
];

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LoginInput({
  label,
  children,
  rightLabel,
}: {
  label: string;
  children: React.ReactNode;
  rightLabel?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        {rightLabel}
      </div>
      {children}
    </div>
  );
}

>>>>>>> theirs
export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [totpCode, setTotpCode] = useState("");
<<<<<<< ours
=======
  const [rememberMe, setRememberMe] = useState(true);
>>>>>>> theirs
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
<<<<<<< ours
        // next-auth, signIn() body'sini URLSearchParams ile kodluyor;
        // value undefined olursa literal "undefined" string'i gönderilir
        // (URLSearchParams'ın bilinen davranışı). Bu yüzden boş string kullanılıyor.
=======
>>>>>>> theirs
        totpCode: mfaStep ? totpCode : "",
        redirect: false,
      });

      if (result?.error === "MFA_REQUIRED") {
        setMfaStep(true);
        setLoading(false);
        return;
      }

      if (result?.error === "MFA_INVALID") {
        setError("Doğrulama kodu geçersiz. Lütfen tekrar deneyin.");
        setTotpCode("");
        setLoading(false);
        return;
      }

      if (result?.error) {
        setError(mfaStep ? "Doğrulama kodu geçersiz. Lütfen tekrar deneyin." : "E-posta veya şifre hatalı.");
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
<<<<<<< ours
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
          <p className="text-sm font-medium text-gray-500">Yükleniyor...</p>
=======
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc] transition-colors duration-300 dark:bg-[#050816]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-violet-500" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Yükleniyor...</p>
>>>>>>> theirs
        </div>
      </div>
    );
  }

  return (
<<<<<<< ours
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
=======
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8fc] p-4 selection:bg-violet-200/60 dark:bg-[#050816] dark:selection:bg-violet-500/30 md:p-6">
      <ThreeBackground isDark={isDark} />

      <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(245,247,252,0.82),rgba(232,236,248,0.50)_48%,rgba(241,244,251,0.74))] dark:bg-[linear-gradient(160deg,rgba(5,8,22,0.50),rgba(7,12,26,0.35)_48%,rgba(6,10,22,0.72))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1280px] overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_30px_90px_rgba(79,70,229,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#070b18]/58 md:min-h-[calc(100vh-3rem)]">
        <section className="flex w-full flex-col bg-white/90 px-6 py-8 dark:bg-[#0a1020]/88 md:max-w-[560px] md:px-12 md:py-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo priority className="w-[158px] sm:w-[180px]" width={420} height={134} />
            </Link>
            <Link
              href="/"
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300 md:inline-flex"
            >
              Ana Sayfa
            </Link>
          </div>

          <div className="my-auto py-8 md:py-12">
            <div className="mb-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Panele giriş</p>
              <h1 className="mt-4 text-[2rem] font-black tracking-tight text-slate-950 dark:text-white sm:text-[2.15rem]">
                Tekrar hoş geldiniz
              </h1>
              <p className="mt-3 max-w-[28rem] text-[15px] leading-7 text-slate-500 dark:text-slate-400">
                QR akışlarınızı, menülerinizi ve tarama raporlarınızı yönetmek için giriş yapın.
              </p>
            </div>

            {!mfaStep && (
              <>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google ile devam et
                </button>

                <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  <span>veya e-posta ile</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>
              </>
            )}

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
>>>>>>> theirs
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {mfaStep ? (
                <div className="space-y-2">
<<<<<<< ours
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Doğrulama Kodu</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Authenticator uygulamanızdaki 6 haneli kodu girin.</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    required
                    disabled={loading}
                    className="w-full rounded-lg px-3 py-2.5 text-center text-lg font-mono tracking-widest outline-none transition-colors
                      bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333]
                      text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600
                      focus:border-black dark:focus:border-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => { setMfaStep(false); setTotpCode(""); setError(""); }}
                    disabled={loading}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    ← E-posta/şifreye geri dön
=======
                  <LoginInput label="Doğrulama Kodu">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                      required
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center font-mono text-lg tracking-[0.35em] text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:bg-white/[0.06] dark:focus:ring-violet-500/10"
                    />
                  </LoginInput>
                  <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    Authenticator uygulamanızdaki 6 haneli kodu girin.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep(false);
                      setTotpCode("");
                      setError("");
                    }}
                    disabled={loading}
                    className="text-xs font-semibold text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300"
                  >
                    ← E-posta ve şifreye geri dön
>>>>>>> theirs
                  </button>
                </div>
              ) : (
                <>
<<<<<<< ours
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
                </>
              )}

            <button
              type="submit"
              disabled={loading || !email || !password || (mfaStep && totpCode.length !== 6)}
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
                  <span>{mfaStep ? "Doğrula ve Giriş Yap" : "Giriş Yap"}</span>
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
            Şifrenizi unuttuysanız e-posta ile güvenli yenileme linki alabilirsiniz.
          </p>
          <p className="mt-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            Hesabınız yok mu?{" "}
            <Link href="/signup" className="font-black text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400">
              Ücretsiz Üye Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
=======
                  <LoginInput label="E-posta">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@sirket.com"
                      autoFocus
                      required
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:bg-white/[0.06] dark:focus:ring-violet-500/10"
                    />
                  </LoginInput>

                  <LoginInput
                    label="Şifre"
                    rightLabel={
                      <Link
                        href="/auth/reset"
                        className="text-[12.5px] font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                      >
                        Şifremi unuttum
                      </Link>
                    }
                  >
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-16 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:bg-white/[0.06] dark:focus:ring-violet-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((prev) => !prev)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </LoginInput>

                  <button
                    type="button"
                    onClick={() => setRememberMe((prev) => !prev)}
                    className="flex items-center gap-3 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-black transition ${
                        rememberMe
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-300 bg-white text-transparent dark:border-white/15 dark:bg-white/[0.03]"
                      }`}
                    >
                      ✓
                    </span>
                    Beni hatırla
                  </button>
                </>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password || (mfaStep && totpCode.length !== 6)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <span>{mfaStep ? "Doğrula ve Giriş Yap" : "Giriş Yap"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {!mfaStep && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  <span>alternatif giriş</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GithubIcon className="text-slate-900 dark:text-white" />
                  GitHub ile devam et
                </button>
              </>
            )}

            <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              Hesabınız yok mu?{" "}
              <Link href="/signup" className="font-black text-violet-600 transition hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200">
                Kayıt olun
              </Link>
            </p>
          </div>

          <div className="pt-6 text-[11.5px] text-slate-400 dark:text-slate-500">© 2026 QR Publish · KVKK uyumlu</div>
        </section>

        <section className="relative hidden flex-1 overflow-hidden md:flex">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(238,240,252,0.76),rgba(231,234,251,0.56)_48%,rgba(234,237,246,0.68))] dark:bg-[linear-gradient(160deg,rgba(13,18,38,0.34),rgba(10,16,34,0.24)_48%,rgba(8,14,30,0.52))]" />
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/20" />
          <div className="absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,rgba(255,255,255,0.68),transparent)] dark:bg-[linear-gradient(90deg,rgba(10,16,32,0.48),transparent)]" />

          <div className="relative z-10 flex w-full flex-col justify-center px-12 py-12 lg:px-16">
            <div className="max-w-[460px]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">QR Publish Platform</p>
              <h2 className="mt-4 text-[2rem] font-black leading-[1.15] tracking-tight text-slate-950 dark:text-white lg:text-[2.2rem]">
                Tek panelden yayınla, yönet ve ölç.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                Dinamik QR, restoran menüsü, dijital kartvizit ve gerçek zamanlı tarama analitiği; hepsi bir arada.
              </p>
            </div>

            <div className="relative mt-10 max-w-[430px] rounded-[1.4rem] border border-white/70 bg-white/72 p-6 shadow-[0_24px_60px_rgba(31,35,80,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/56">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bu ay toplam tarama</p>
                  <div className="mt-2 text-[2rem] font-black tracking-tight text-slate-950 dark:text-white">1.248.320</div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <TrendingUp size={14} />
                  18.3%
                </div>
              </div>
              <div className="mt-6 flex h-[74px] items-end gap-[7px]">
                {statBars.map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className={`flex-1 rounded-t-[5px] ${index >= 5 ? "bg-violet-600 dark:bg-violet-400" : "bg-violet-200/90 dark:bg-violet-300/25"}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute bottom-10 right-10 rounded-[1.25rem] border border-white/70 bg-white/58 p-4 shadow-[0_24px_60px_rgba(31,35,80,0.20)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/50">
              <div className="grid grid-cols-14 gap-[2px]">
                {qrPattern.join("").split("").map((cell, index) => {
                  const active = cell === "1";
                  const accent = index % 5 === 0;
                  return (
                    <div
                      key={index}
                      className={`h-[11px] w-[11px] rounded-[2px] ${
                        active
                          ? accent
                            ? "bg-violet-600 dark:bg-violet-400"
                            : "bg-slate-900 dark:bg-white"
                          : "bg-transparent"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="absolute left-12 top-10 flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-xs font-bold text-violet-700 shadow-[0_16px_40px_rgba(31,35,80,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/50 dark:text-violet-200">
              <Sparkles size={14} />
              Dinamik QR, menü ve raporlama
            </div>
          </div>
        </section>
      </div>
    </div>
>>>>>>> theirs
  );
}

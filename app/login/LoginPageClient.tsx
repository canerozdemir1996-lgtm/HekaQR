"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { signInWithCredentials, signInWithOAuthProvider } from "@/lib/auth-client";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Sparkles, TrendingUp } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useTheme } from "@/lib/theme";
import { safeInternalPath, withNextParam } from "@/lib/auth-redirect";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Post-login redirect target from a `?next=` param. Only same-origin absolute
// paths are honoured — protocol-relative (`//host`) and any scheme are rejected
// to avoid an open redirect. Falls back to the dashboard.
function resolveSafeNextPath(): string {
  const fallback = "/dashboard";
  if (typeof window === "undefined") return fallback;
  const params = new URLSearchParams(window.location.search);
  // `callbackUrl` is read only as a compatibility bridge for old links. New
  // auth entry points consistently emit `next`.
  return safeInternalPath(params.get("next") ?? params.get("callbackUrl"), fallback);
}

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
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.52 11.52 0 0 1 12 5.8c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.8 24 17.302 24 12 24 5.373 18.627 0 12 0Z" />
    </svg>
  );
}

function LoginInput({
  label,
  htmlFor,
  children,
  rightLabel,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  rightLabel?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        {rightLabel}
      </div>
      {children}
    </div>
  );
}

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [mfaStep, setMfaStep] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const validateLoginFields = useCallback(() => {
    const next: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) next.email = "E-posta adresi gerekli.";
    else if (!EMAIL_REGEX.test(normalizedEmail)) next.email = "Geçerli bir e-posta adresi girin.";
    if (!password) next.password = "Şifre gerekli.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [email, password]);

  useEffect(() => {
    const checkSession = async () => {
      const destination = resolveSafeNextPath();
      const params = new URLSearchParams(window.location.search);
      setNextPath(destination);
      if (params.get("verified") === "1") {
        setNotice("E-posta adresiniz doğrulandı. Şimdi hesabınıza giriş yapabilirsiniz.");
      }
      if (params.get("error")) {
        setError("Sosyal giriş tamamlanamadı. Lütfen tekrar deneyin veya e-posta ile giriş yapın.");
      }
      setChecking(true);
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (session?.user) {
          router.replace(destination);
          return;
        }
      } finally {
        setChecking(false);
      }
    };

    void checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (loading) return;
    if (!mfaStep && !validateLoginFields()) return;
    setLoading(true);

    try {
      const result = await signInWithCredentials({
        email,
        password,
        totpCode: mfaStep ? totpCode : undefined,
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
        if (result.error === "EMAIL_NOT_CONFIRMED") {
          setError("E-postanızı doğrulamanız gerekiyor. Lütfen gelen kutunuzdaki doğrulama bağlantısını açın.");
        } else {
          setError(mfaStep ? "Doğrulama kodu geçersiz. Lütfen tekrar deneyin." : "E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
        }
        setLoading(false);
        return;
      }

      if (result?.ok) {
        router.replace(nextPath);
      }
    } catch {
      setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      await signInWithOAuthProvider(provider, { callbackUrl: nextPath });
    } catch {
      setError(`${provider} ile giriş başarısız.`);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center overflow-hidden bg-[#f7f8fc] px-4 py-6 selection:bg-violet-200/60 dark:bg-[#050816] dark:selection:bg-violet-500/30 sm:px-6 lg:px-10">
      <ThreeBackground isDark={isDark} />
      <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(245,247,252,0.76),rgba(232,236,248,0.40)_48%,rgba(241,244,251,0.66))] dark:bg-[linear-gradient(160deg,rgba(5,8,22,0.40),rgba(7,12,26,0.26)_48%,rgba(6,10,22,0.56))]" />
      <div className="absolute inset-y-[10%] right-[10%] hidden w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.18),transparent_68%)] blur-3xl md:block dark:bg-[radial-gradient(circle,rgba(45,212,191,0.12),transparent_68%)]" />
      <div className="absolute bottom-[6%] left-[6%] hidden h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38),transparent_72%)] blur-3xl md:block dark:bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_72%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between gap-8 lg:gap-16">
        <section className="w-full max-w-[480px] rounded-[2rem] border border-white/50 bg-white/24 px-6 py-8 shadow-[0_28px_80px_rgba(79,70,229,0.16)] backdrop-blur-[24px] dark:border-white/10 dark:bg-[#0b1328]/38 md:px-10 md:py-10">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo priority className="w-[158px] sm:w-[180px]" width={420} height={134} />
          </Link>

          <div className="mt-8 md:mt-10">
            <div className="mb-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Panele giriş</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-[2rem] font-black tracking-tight text-slate-950 dark:text-white sm:text-[2.15rem]">
                  Tekrar hoş geldiniz
                </h1>
                {checking && <Loader2 size={18} className="animate-spin text-violet-500" aria-label="Oturum kontrol ediliyor" />}
              </div>
              <p className="mt-3 max-w-[28rem] text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                QR akışlarınızı, menülerinizi ve tarama raporlarınızı yönetmek için giriş yapın.
              </p>
            </div>

            {!mfaStep && (
              <>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/60 bg-white/70 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google ile devam et
                </button>

                <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                  <span>veya e-posta ile</span>
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                </div>
              </>
            )}

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && !error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {mfaStep ? (
                <div className="space-y-2">
                  <LoginInput label="Doğrulama kodu" htmlFor="login-totp">
                    <input
                      id="login-totp"
                      type="text"
                      inputMode="numeric"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                      required
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-white/65 bg-white/76 px-4 text-center font-mono text-lg tracking-[0.35em] text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:bg-white/[0.10] dark:focus:ring-violet-500/10"
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
                  </button>
                </div>
              ) : (
                <>
                  <LoginInput label="E-posta" htmlFor="login-email">
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      onBlur={() => {
                        const normalizedEmail = email.trim();
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: !normalizedEmail
                            ? undefined
                            : EMAIL_REGEX.test(normalizedEmail)
                              ? undefined
                              : "Geçerli bir e-posta adresi girin.",
                        }));
                      }}
                      placeholder="ornek@sirket.com"
                      autoFocus
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                      className={`h-12 w-full rounded-xl border bg-white/76 px-4 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:bg-white/[0.06] dark:text-white dark:focus:bg-white/[0.10] dark:focus:ring-violet-500/10 ${fieldErrors.email ? "border-red-500" : "border-white/65 dark:border-white/10"}`}
                    />
                    {fieldErrors.email && <p id="login-email-error" className="mt-1 text-[12.5px] font-semibold text-red-600">{fieldErrors.email}</p>}
                  </LoginInput>

                  <LoginInput
                    label="Şifre"
                    htmlFor="login-password"
                    rightLabel={
                      <Link
                        href="/forgot-password"
                        className="inline-flex min-h-11 items-center text-[12.5px] font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                      >
                        Şifremi unuttum
                      </Link>
                    }
                  >
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                        onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                        placeholder="••••••••"
                        disabled={loading}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={[fieldErrors.password ? "login-password-error" : "", capsLock ? "login-caps-warning" : ""].filter(Boolean).join(" ") || undefined}
                        className={`h-12 w-full rounded-xl border bg-white/76 px-4 pr-16 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:bg-white/[0.06] dark:text-white dark:focus:bg-white/[0.10] dark:focus:ring-violet-500/10 ${fieldErrors.password ? "border-red-500" : "border-white/65 dark:border-white/10"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((prev) => !prev)}
                        disabled={loading}
                        aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                        aria-pressed={showPw}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldErrors.password && <p id="login-password-error" className="mt-1 text-[12.5px] font-semibold text-red-600">{fieldErrors.password}</p>}
                    {capsLock && <p id="login-caps-warning" className="mt-1 text-[12.5px] font-semibold text-amber-600">Caps Lock açık görünüyor.</p>}
                  </LoginInput>

                </>
              )}

              <button
                type="submit"
                disabled={loading || (mfaStep && totpCode.length !== 6)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <span>{mfaStep ? "Doğrula ve giriş yap" : "Giriş yap"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {!mfaStep && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                  <span>alternatif giriş</span>
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/60 bg-white/70 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GithubIcon className="text-slate-900 dark:text-white" />
                  GitHub ile devam et
                </button>
              </>
            )}

            <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              Hesabınız yok mu?{" "}
              <Link href={withNextParam("/register", nextPath)} className="inline-flex min-h-11 items-center font-black text-violet-600 transition hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200">
                Kayıt olun
              </Link>
            </p>
          </div>

          <div className="mt-8 text-[11.5px] text-slate-400 dark:text-slate-500">© 2026 QR Publish · KVKK uyumlu</div>
        </section>

        <section className="relative hidden min-h-[640px] flex-1 items-center justify-end md:flex">
          <div className="w-full max-w-[620px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/40 px-4 py-2 text-xs font-bold text-violet-700 shadow-[0_16px_40px_rgba(31,35,80,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/30 dark:text-violet-200">
              <Sparkles size={14} />
              QR Publish Platform
            </div>

            <div className="mt-10 max-w-[420px]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">Yeni nesil yönetim</p>
              <h2 className="mt-4 text-[2.1rem] font-black leading-[1.06] tracking-tight text-slate-950 dark:text-white lg:text-[2.45rem]">
                Tek panelden yayınla, yönet ve ölç.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                Dinamik QR, restoran menüsü, dijital kartvizit ve gerçek zamanlı tarama analitiği; hepsi arkaplandaki akış bozulmadan bir arada.
              </p>
            </div>

            <div className="relative mt-12 w-full max-w-[520px] pr-16">
              <div className="rounded-[1.6rem] border border-white/70 bg-white/60 p-6 shadow-[0_24px_60px_rgba(31,35,80,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/42">
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
                <div className="mt-6 flex h-[78px] items-end gap-[7px]">
                  {statBars.map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className={`flex-1 rounded-t-[5px] ${index >= 5 ? "bg-violet-600 dark:bg-violet-400" : "bg-violet-200/90 dark:bg-violet-300/25"}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="absolute -bottom-8 right-0 rounded-[1.2rem] border border-white/70 bg-white/72 p-3 shadow-[0_24px_60px_rgba(31,35,80,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1630]/48">
                <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[2px]">
                  {qrPattern.join("").split("").map((cell, index) => {
                    const active = cell === "1";
                    const accent = index % 5 === 0;
                    return (
                      <div
                        key={index}
                        className={`h-[8px] w-[8px] rounded-[2px] ${
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

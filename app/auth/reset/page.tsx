"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false); // Yeni state

  useEffect(() => {
    const sb = getSupabase();
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    const init = async () => {
      try {
        if (accessToken && refreshToken && type === "recovery") {
          const { error: sessionError } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          window.history.replaceState(null, "", window.location.pathname);
        }
        const { data: { session } } = await sb.auth.getSession();
        setHasSession(!!session);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Şifre linki doğrulanamadı.");
      } finally {
        setReady(true);
      }
    };
    void init();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []); // isMounted'ı buraya eklemiyoruz, ayrı bir useEffect'te olacak

  useEffect(() => { setIsMounted(true); }, []); // Client tarafında mount olduğunda isMounted'ı true yap

  const requestReset = async () => {
    setError("");
    setMailSent(false);
    if (!email.trim()) { setError("E-posta adresinizi girin."); return; }
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: resetError } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (resetError) throw resetError;
      setMailSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şifre yenileme e-postası gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!pw1 || pw1.length < 8) { setError("Şifre en az 8 karakter olmalı."); return; }
    if (pw1 !== pw2) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: upErr } = await sb.auth.updateUser({ password: pw1, data: { must_change_password: false } });
      if (upErr) throw upErr;
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !isMounted) { // isMounted kontrolünü ekle
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-violet-400"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-2xl p-6 surface ${isDark ? "text-white" : "text-slate-900"}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Lock size={16}/>
          </div>
          <div>
            <h1 className="font-black text-base">{hasSession ? "Şifreyi Değiştir" : "Şifremi Unuttum"}</h1>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {hasSession ? "E-posta doğrulama linki ile geldiniz." : "E-postanıza güvenli yenileme linki gönderelim."}
            </p>
          </div>
        </div>

        {done ? (
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-emerald-300 text-sm border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 size={16}/> Şifre güncellendi. Yönlendiriliyorsunuz…
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-red-300 text-sm mb-4 border border-red-500/20 bg-red-500/10">
                <AlertCircle size={15} className="shrink-0 mt-0.5"/>
                <span>{error}</span>
              </div>
            )}

            {!hasSession ? (
              <div className="space-y-3">
                {mailSent && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0"/>
                    <span>Şifre yenileme linki gönderildi. E-postanızdaki link ile yeni şifre belirleyebilirsiniz.</span>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">E-posta</label>
                  <div className="relative mt-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && requestReset()}
                      placeholder="ornek@sirket.com"
                      className={`w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all focus-premium ${
                        isDark
                          ? "text-white bg-white/5 border border-white/10 placeholder:text-slate-600"
                          : "text-slate-900 bg-white border border-slate-200 placeholder:text-slate-400"
                      }`}
                    />
                    <Mail size={15} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  </div>
                </div>
                <button
                  onClick={requestReset}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1 btn-premium focus-premium"
                >
                  {loading ? <><Loader2 size={15} className="animate-spin"/> Gönderiliyor…</> : "Yenileme Linki Gönder"}
                </button>
              </div>
            ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yeni Şifre</label>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all focus-premium ${
                      isDark
                        ? "text-white bg-white/5 border border-white/10 placeholder:text-slate-600"
                        : "text-slate-900 bg-white border border-slate-200 placeholder:text-slate-400"
                    }`}
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"}`}>
                    {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yeni Şifre (Tekrar)</label>
                <input
                  type={show ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full mt-1 rounded-xl px-4 py-3 text-sm outline-none transition-all focus-premium ${
                    isDark
                      ? "text-white bg-white/5 border border-white/10 placeholder:text-slate-600"
                      : "text-slate-900 bg-white border border-slate-200 placeholder:text-slate-400"
                  }`}
                />
              </div>

              <button
                onClick={submit}
                disabled={!hasSession || loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1 btn-premium focus-premium"
              >
                {loading ? <><Loader2 size={15} className="animate-spin"/> Güncelleniyor…</> : "Şifreyi Güncelle"}
              </button>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

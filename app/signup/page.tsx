"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getSupabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mailSent, setMailSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (password !== confirm) return setError("Şifreler eşleşmiyor.");
    setLoading(true);
    try {
      const { data, error: signUpError } = await getSupabase().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=1`,
          data: { full_name: name.trim(), name: name.trim(), role: "user" },
        },
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setMailSent(true);
        return;
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) router.push("/dashboard");
      else router.push("/login?registered=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hesap oluşturulamadı.";
      setError(message.toLowerCase().includes("already") ? "Bu e-posta ile daha önce hesap açılmış." : message);
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "github") {
    setLoading(true);
    await signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950 dark:bg-black dark:text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-7 flex w-fit"><BrandLogo priority className="w-[220px]" width={420} height={134} /></Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-[#0a0a0a] dark:shadow-black/40 sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-black">Ücretsiz Hesap Oluştur</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">İlk dinamik QR kodunuzu birkaç dakika içinde yayınlayın.</p>
          </div>

          {mailSent ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 size={20} />
              <p className="mt-3 font-black">E-postanızı doğrulayın</p>
              <p className="mt-1 text-sm font-semibold">Gönderdiğimiz bağlantıya tıkladıktan sonra giriş yapabilirsiniz.</p>
              <Link href="/login" className="mt-4 inline-flex font-black underline">Giriş ekranına dön</Link>
            </div>
          ) : (
            <>
              {error && <div className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"><AlertCircle size={17} className="shrink-0" />{error}</div>}
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Ad Soyad"><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="signup-input" placeholder="Adınız Soyadınız" /></Field>
                <Field label="E-posta"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="signup-input" placeholder="ornek@sirket.com" /></Field>
                <Field label="Şifre">
                  <div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" className="signup-input pr-11" placeholder="En az 8 karakter" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                </Field>
                <Field label="Şifre Tekrar"><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" className="signup-input" /></Field>
                <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <>Hesap Oluştur <ArrowRight size={16} /></>}</button>
              </form>
              <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />veya<span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => void oauth("google")} disabled={loading} className="h-11 rounded-xl border border-slate-200 text-sm font-black hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">Google ile Üye Ol</button>
                <button onClick={() => void oauth("github")} disabled={loading} className="h-11 rounded-xl border border-slate-200 text-sm font-black hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">GitHub ile Üye Ol</button>
              </div>
            </>
          )}
          <p className="mt-6 text-center text-sm font-semibold text-slate-500">Zaten hesabınız var mı? <Link href="/login" className="font-black text-violet-600">Giriş Yap</Link></p>
        </section>
      </div>
      <style jsx>{`.signup-input{height:44px;width:100%;border-radius:12px;border:1px solid rgb(226 232 240);background:transparent;padding:0 12px;font-size:14px;outline:none}.signup-input:focus{border-color:rgb(124 58 237);box-shadow:0 0 0 3px rgb(124 58 237 / .12)}:global(.dark) .signup-input{border-color:rgb(255 255 255 / .1);background:rgb(255 255 255 / .03);color:white}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}

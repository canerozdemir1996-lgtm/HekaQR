"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, KeyRound, AlertCircle, Check } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? "");
      setLoading(false);
    }).catch(() => { router.replace("/login"); });
  }, [router]);

  const send = async () => {
    setError(""); setSending(true); setSent(false);
    try {
      const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
      if (error) throw error;
      setSent(true);
      setTimeout(() => setSent(false), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "E-posta gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const logout = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-violet-400"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl p-6 surface text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <KeyRound size={16}/>
          </div>
          <div>
            <h1 className="font-black text-base">Şifre Değişikliği Zorunlu</h1>
            <p className="text-xs text-slate-400 mt-0.5">Güvenlik için ilk girişte şifrenizi yenilemelisiniz.</p>
          </div>
        </div>

        <div className="text-sm text-slate-300">
          <p>Şifre değişikliği linki şu e-postaya gönderilecek:</p>
          <p className="mt-1 font-mono text-xs text-slate-400 break-all">{email}</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-red-300 text-sm mt-4 border border-red-500/20 bg-red-500/10">
            <AlertCircle size={15} className="shrink-0 mt-0.5"/>
            <span>{error}</span>
          </div>
        )}

        {sent && (
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-emerald-300 text-sm mt-4 border border-emerald-500/20 bg-emerald-500/10">
            <Check size={15}/> E-posta gönderildi. Linke tıklayıp şifreyi güncelleyin.
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <button
            onClick={send}
            disabled={!email || sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-premium focus-premium"
          >
            {sending ? <><Loader2 size={15} className="animate-spin"/> Gönderiliyor…</> : <><Mail size={16}/> Linki Gönder</>}
          </button>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  );
}


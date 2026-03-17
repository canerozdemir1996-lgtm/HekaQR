"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UserCircle, KeyRound, LogOut, Mail, Check, Loader2, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export function ProfileMenu({
  email,
  role,
  isDark,
  onLogout,
}: {
  email: string;
  role?: string;
  isDark: boolean;
  onLogout: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initial = useMemo(() => (email?.[0] ?? "U").toUpperCase(), [email]);

  const sendReset = async () => {
    setErr(""); setSending(true); setSent(false);
    try {
      const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
      if (error) throw error;
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "E-posta gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const bg = isDark ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200";
  const tx = isDark ? "text-slate-200" : "text-slate-700";
  const sub = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(p => !p)}
        className={`h-9 px-2.5 rounded-xl border flex items-center gap-2 transition-all ${isDark ? "border-slate-700 hover:border-slate-600" : "border-slate-200 hover:border-slate-300"}`}
        title="Profil"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-black">{initial}</span>
        </div>
        <UserCircle size={16} className={sub}/>
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl overflow-hidden z-50 ${bg}`}>
          <div className={`p-4 border-b ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-widest ${sub}`}>HESAP</p>
                <p className={`text-sm font-semibold mt-1 truncate ${tx}`}>{email || "Kullanıcı"}</p>
                {role && <p className={`text-[10px] mt-0.5 capitalize ${sub}`}>{role}</p>}
              </div>
              <button onClick={() => setOpen(false)} className={`${sub} hover:text-red-400 transition-colors`}>
                <X size={14}/>
              </button>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={sendReset}
              disabled={!email || sending}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 ${
                isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                {sending ? <Loader2 size={14} className="animate-spin text-violet-400"/> : <KeyRound size={14} className="text-violet-400"/>}
                Şifre değiştir (mail ile)
              </span>
              <Mail size={14} className={sub}/>
            </button>

            {sent && (
              <div className={`mt-2 px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                isDark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}>
                <Check size={12}/> E-posta gönderildi. Gelen kutunuzu kontrol edin.
              </div>
            )}
            {err && (
              <div className={`mt-2 px-3 py-2 rounded-xl text-xs ${
                isDark ? "bg-red-500/10 border border-red-500/20 text-red-300" : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {err}
              </div>
            )}

            <div className={`my-2 h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}/>

            <button
              onClick={() => { setOpen(false); void onLogout(); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isDark ? "text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"
              }`}
            >
              <LogOut size={14}/> Çıkış yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


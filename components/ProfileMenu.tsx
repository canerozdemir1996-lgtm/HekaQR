"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserCircle, KeyRound, LogOut, Mail, Check, Loader2, X, Image as ImageIcon, Upload, Shield } from "lucide-react";
import { getOrCreateSettings, getSupabase, updateSettings } from "@/lib/supabase";
import Image from "next/image";
import { useToast } from "@/components/toast";

export function ProfileMenu({
  email,
  role,
  isDark,
  onLogout,
  avatarUrl,
}: {
  email: string;
  role?: string;
  isDark: boolean;
  onLogout: () => Promise<void> | void;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [avatar, setAvatar] = useState<string>(avatarUrl ?? "");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initial = useMemo(() => (email?.[0] ?? "U").toUpperCase(), [email]);

  useEffect(() => {
    setAvatar(avatarUrl ?? "");
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;
    // lazy load settings (in case avatarUrl wasn't passed)
    getOrCreateSettings().then(s => {
      if (!avatar && s.avatar_url) setAvatar(s.avatar_url);
    }).catch(() => {});
  }, [open, avatar]);

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

  const onPickAvatar = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Lütfen bir görsel dosyası seçin."); return; }
    if (file.size > 1_200_000) { toast.error("Görsel çok büyük. 1.2MB altında seçin."); return; }
    setSavingAvatar(true);
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.id) throw new Error("Oturum bulunamadı");

      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/avatar.${ext || "png"}`;
      const { error: upErr } = await sb.storage.from("avatars").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const updated = await updateSettings({ avatar_url: publicUrl });
      setAvatar(updated.avatar_url ?? publicUrl);
      toast.success("Profil fotoğrafı güncellendi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Profil fotoğrafı kaydedilemedi.");
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* 2026: Avatar Button - Micro-interactions + Glow */}
      <button
        onClick={() => setOpen(p => !p)}
        className={`h-9 px-2.5 rounded-xl border flex items-center gap-2 transition-all duration-300
          ${isDark 
            ? "bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-glow-primary" 
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }
          hover:scale-105 active:scale-95`}
        title="Profil Menüsü"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 border border-white/10 transition-transform duration-300 group-hover:rotate-3">
          {avatar
            ? <Image src={avatar} alt="avatar" width={24} height={24} className="w-6 h-6 object-cover" unoptimized />
            : <span className="text-white text-[10px] font-black">{initial}</span>
          }
        </div>
        <UserCircle size={16} className={`${sub} transition-colors duration-300`}/>
      </button>

      {/* 2026: Dropdown Menu - Glassmorphism + Smooth animations */}
      {open && (
        <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl overflow-hidden z-50 
          animate-fade-in transition-all duration-300
          ${isDark 
            ? "bg-black/40 backdrop-blur-2xl border-white/10" 
            : "bg-white/95 backdrop-blur-md border-slate-200"
          }`}>
          {/* 2026: Header - Glassmorphism + smooth hover */}
          <div className={`p-4 border-b backdrop-blur-sm transition-colors duration-300 ${isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-widest ${sub}`}>HESAP</p>
                <p className={`text-sm font-semibold mt-1 truncate ${tx}`}>{email || "Kullanıcı"}</p>
                {role && <p className={`text-[10px] mt-0.5 capitalize ${sub} first-letter:uppercase`}>{role}</p>}
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className={`${sub} hover:text-red-400 transition-all duration-300 hover:scale-110 active:scale-95`}
              >
                <X size={14}/>
              </button>
            </div>
          </div>

          <div className="p-2">
          {/* 2026: Avatar Upload - Glass card + smooth interactions */}
          <div className={`mx-2 mb-2 rounded-xl border backdrop-blur-md p-3 transition-all duration-300
            ${isDark 
              ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20" 
              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            }`}>
            <p className={`text-[10px] font-black tracking-widest ${sub}`}>PROFİL FOTOĞRAFI</p>
            <div className="flex items-center gap-3 mt-2">
              <div className={`w-10 h-10 rounded-2xl overflow-hidden border backdrop-blur-sm
                ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}
                flex items-center justify-center transition-all duration-300 hover:scale-105`}>
                {avatar
                  ? <Image src={avatar} alt="avatar" width={40} height={40} className="w-10 h-10 object-cover" unoptimized />
                  : <ImageIcon size={16} className={sub}/>
                }
              </div>
              <label className={`flex-1 cursor-pointer px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-300
                ${isDark 
                  ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.08] active:scale-95 hover:shadow-glow-primary" 
                  : "border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                }
                hover:scale-105 active:scale-95`}>
                <span className="inline-flex items-center gap-2">
                  {savingAvatar ? <Loader2 size={13} className="animate-spin text-violet-500"/> : <Upload size={13}/>}
                  {avatar ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void onPickAvatar(e.target.files?.[0])}/>
              </label>
            </div>
            <p className={`text-[10px] mt-2 ${sub}`}>PNG/JPG · max 1.2MB</p>
          </div>

            {/* 2026: Password Reset Button - Glassmorphism + micro-interactions */}
            <button
              onClick={sendReset}
              disabled={!email || sending}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed
                ${isDark 
                  ? "text-slate-300 hover:bg-white/[0.08] hover:shadow-glow-primary active:scale-95" 
                  : "text-slate-700 hover:bg-slate-50 active:scale-95"
                }
                hover:scale-105`}
            >
              <span className="flex items-center gap-2">
                {sending ? <Loader2 size={14} className="animate-spin text-violet-400"/> : <KeyRound size={14} className="text-violet-400"/>}
                Şifre değiştir (mail ile)
              </span>
              <Mail size={14} className={`${sub} transition-colors duration-300`}/>
            </button>

            {/* 2026: Status Messages - Glassmorphism cards with animations */}
            {sent && (
              <div className={`mt-2 px-3 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm transition-all duration-300 animate-fade-in
                ${isDark 
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" 
                  : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                }`}>
                <Check size={12}/> E-posta gönderildi. Gelen kutunuzu kontrol edin.
              </div>
            )}
            {err && (
              <div className={`mt-2 px-3 py-2 rounded-xl text-xs backdrop-blur-sm transition-all duration-300 animate-fade-in
                ${isDark 
                  ? "bg-red-500/10 border border-red-500/20 text-red-300" 
                  : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                {err}
              </div>
            )}

            <div className={`my-2 h-px transition-colors duration-300 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}/>

            {(role === "admin" || role === "owner") && (
              <Link
                href="/admin"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-400 hover:to-indigo-600 active:scale-95"
                onClick={() => setOpen(false)}
              >
                <Shield size={14}/> Admin Paneli
              </Link>
            )}

            {/* 2026: Logout Button - Red glow with micro-interactions */}
            <button
              onClick={() => { setOpen(false); void onLogout(); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 hover:scale-105 active:scale-95
                ${isDark 
                  ? "text-red-300 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:border-red-500/20" 
                  : "text-red-600 hover:bg-red-50 hover:border-red-200"
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


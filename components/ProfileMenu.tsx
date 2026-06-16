"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserCircle, KeyRound, LogOut, Mail, Check, Loader2, X, Image as ImageIcon, Upload, Shield } from "lucide-react";
import { getOrCreateSettings, getSupabase, updateSettings } from "@/lib/supabase";
import Image from "next/image";
import { useToast } from "@/components/toast";
import { useSession } from "next-auth/react";

export function ProfileMenu({
  email,
  role,
  onLogout,
  avatarUrl,
}: {
  email: string;
  role?: string;
  onLogout: () => Promise<void> | void;
  avatarUrl?: string | null;
}) {
  // Yetkiyi üst bileşenden bekleme, doğrudan oturumdan kendin çek
  const { data: session } = useSession();
  const currentRole = role || (session?.user as any)?.role || "user";
  const currentEmail = email || session?.user?.email || "";

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
      <button
        onClick={() => setOpen(p => !p)}
        className="h-9 px-2 rounded-lg border flex items-center gap-2 transition-colors border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#111]"
        title="Profil Menüsü"
      >
        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-[#333] flex items-center justify-center shrink-0">
          {avatar
            ? <Image src={avatar} alt="avatar" width={24} height={24} className="w-6 h-6 object-cover" unoptimized />
            : <span className="text-gray-600 dark:text-gray-300 text-[10px] font-bold">{initial}</span>
          }
        </div>
        <UserCircle size={16} className="text-gray-500"/>
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-lg z-50 overflow-hidden 
          bg-white dark:bg-[#111] border-gray-200 dark:border-[#333]`}>
          <div className="p-4 border-b border-gray-100 dark:border-[#333]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">HESAP</p>
                <p className="text-sm font-medium mt-0.5 truncate text-gray-900 dark:text-white">{currentEmail || "Kullanıcı"}</p>
                <p className="text-xs mt-0.5 capitalize text-gray-500">{currentRole}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={14}/>
              </button>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={sendReset}
              disabled={!email || sending}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]"
            >
              {sending ? <Loader2 size={14} className="animate-spin"/> : <KeyRound size={14}/>}
              Şifremi Değiştir
            </button>

            {sent && (
              <div className="mt-2 px-3 py-2 rounded-md text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Check size={12}/> E-posta gönderildi. Gelen kutunuzu kontrol edin.
              </div>
            )}

            <div className="my-1 h-px bg-gray-100 dark:bg-[#333]"/>

            {(currentRole === "admin" || currentRole === "owner") && (
              <Link
                href="/admin"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]"
                onClick={() => setOpen(false)}
              >
                <Shield size={14}/> Admin Paneli
              </Link>
            )}

            <button
              onClick={() => { setOpen(false); void onLogout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <LogOut size={14}/> Çıkış yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

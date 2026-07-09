"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserCircle, KeyRound, LogOut, Check, Loader2, X, Shield } from "lucide-react";
import { getOrCreateSettings, getSupabase, updateSettings } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import { useSession } from "@/hooks/useSupabaseSession";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { UserAvatar } from "@/components/UserAvatar";
import { roleBadgeText, shouldShowRoleBadge } from "@/lib/user-avatar";

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
      const origin = getPublicAppOrigin(window.location.origin);
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
        className="flex h-11 min-w-11 items-center gap-2 rounded-lg border border-gray-200 px-2 transition-colors hover:bg-gray-50 dark:border-[#333] dark:hover:bg-[#111]"
        title="Profil Menüsü"
      >
        <UserAvatar
          src={avatar}
          user={{ email: currentEmail }}
          className="h-6 w-6 rounded-full"
          fallbackClassName="bg-gray-200 text-gray-600 dark:bg-[#333] dark:text-gray-300"
        />
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
                {shouldShowRoleBadge(currentRole) && (
                  <p className="mt-1 w-fit rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-600 dark:text-amber-300">
                    {roleBadgeText(currentRole)}
                  </p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300" aria-label="Profil menüsünü kapat">
                <X size={14}/>
              </button>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#222]"
            >
              <UserCircle size={14}/> Profil
            </Link>
            <button
              onClick={sendReset}
              disabled={!email || sending}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-[#222]"
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
                className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#222]"
                onClick={() => setOpen(false)}
              >
                <Shield size={14}/> Admin Paneli
              </Link>
            )}

            <button
              onClick={() => { setOpen(false); void onLogout(); }}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut size={14}/> Çıkış yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

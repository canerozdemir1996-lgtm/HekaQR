"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { UserCircle, KeyRound, LogOut, Check, Loader2, X, Shield } from "lucide-react";
import { getOrCreateSettings, getSupabase, updateSettings } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import { useSession } from "@/hooks/useSupabaseSession";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { UserAvatar } from "@/components/UserAvatar";
import { notifyUserAvatarUpdated, roleBadgeText, shouldShowRoleBadge } from "@/lib/user-avatar";

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
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
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

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    setSettingsError("");
    try {
      const settings = await getOrCreateSettings();
      if (settings.avatar_url) setAvatar(settings.avatar_url);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Profil bilgileri yüklenemedi.");
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadSettings();
  }, [loadSettings, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const sendReset = async () => {
    setErr(""); setSending(true); setSent(false);
    try {
      const origin = getPublicAppOrigin(window.location.origin);
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(currentEmail, { redirectTo: `${origin}/auth/reset` });
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
      const nextAvatar = updated.avatar_url ?? publicUrl;
      setAvatar(nextAvatar);
      notifyUserAvatarUpdated(nextAvatar);
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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex h-11 min-w-11 items-center gap-2 rounded-lg border border-gray-200 px-2 transition-colors hover:bg-gray-50 dark:border-[#333] dark:hover:bg-[#111]"
        title="Profil Menüsü"
        aria-label={open ? "Profil menüsünü kapat" : "Profil menüsünü aç"}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
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
        <div
          id={menuId}
          role="region"
          aria-label="Profil menüsü"
          className="absolute right-0 top-full z-[120] mt-2 max-h-[calc(100dvh-5rem)] w-72 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white shadow-lg dark:border-[#333] dark:bg-[#111]"
        >
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
            {loadingSettings && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300" role="status">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Profil bilgileri yükleniyor…
              </div>
            )}

            {settingsError && !loadingSettings && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200" role="alert">
                <p className="font-bold">Profil bilgileri yüklenemedi.</p>
                <p className="mt-1 break-words opacity-90">{settingsError}</p>
                <button type="button" onClick={() => void loadSettings()} className="mt-2 min-h-9 rounded-lg bg-red-100 px-3 py-1.5 font-black text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30">
                  Tekrar dene
                </button>
              </div>
            )}

            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#222]"
            >
              <UserCircle size={14}/> Profil
            </Link>
            <button
              onClick={sendReset}
              disabled={!currentEmail || sending}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-[#222]"
            >
              {sending ? <Loader2 size={14} className="animate-spin"/> : <KeyRound size={14}/>}
              Şifremi Değiştir
            </button>

            {sent && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">
                <Check size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> E-posta gönderildi. Gelen kutunuzu kontrol edin.
              </div>
            )}

            {err && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200" role="alert">
                <p className="break-words">{err}</p>
                <button type="button" onClick={() => void sendReset()} disabled={sending || !currentEmail} className="mt-2 min-h-9 rounded-lg bg-red-100 px-3 py-1.5 font-black text-red-800 hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30">
                  Tekrar dene
                </button>
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

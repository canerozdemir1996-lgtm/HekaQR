"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOutAndRedirect as signOut } from "@/lib/auth-client";
import { AlertCircle, CalendarDays, Camera, CheckCircle2, Download, Gauge, KeyRound, Loader2, Mail, RefreshCw, Save, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { getSupabase, updateSettings, type UserSettings } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { UserAvatar } from "@/components/UserAvatar";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { limitLabel, planExpiryLabel, planTheme, usageLimitLabel } from "@/lib/plan-ui";

type ProfileResponse = {
  account: { email?: string; username?: string | null; phone?: string | null; full_name?: string | null; avatar_url?: string | null; role: string; email_verified: boolean; created_at: string; last_sign_in_at?: string | null };
  settings: UserSettings | null;
  plan: {
    key: string; label: string; status: string; status_label: string; expires_at?: string | null;
    limits: { max_qr: number; analytics_days: number; org_members: number; styles: number; bulk_upload: boolean; api_access: boolean; custom_domain: boolean; max_monthly_scans: number };
    usage: { qr_count: number };
  };
  subscription: null | { billing_interval?: string; card_brand?: string | null; card_last_four?: string | null; renews_at?: string | null; ends_at?: string | null; status?: string; customer_portal_url?: string | null; update_payment_method_url?: string | null };
  payments: Array<{ id: string; status: string; amount?: number | null; currency?: string | null; billed_at?: string | null; provider_invoice_id: string; invoice_url?: string | null }>;
};

const EMPTY_BILLING: Partial<UserSettings> = {
  billing_name: "", company_name: "", tax_office: "", tax_number: "", invoice_email: "",
  billing_address: "", billing_city: "", billing_country: "Türkiye", notification_email: "", security_contact_email: "",
};

let profileSnapshot: ProfileResponse | null = null;

export default function ProfilePage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<ProfileResponse | null>(profileSnapshot);
  const [form, setForm] = useState<Partial<UserSettings>>({ ...EMPTY_BILLING, ...(profileSnapshot?.settings ?? {}) });
  const [loading, setLoading] = useState(!profileSnapshot);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState(profileSnapshot?.account?.username ?? "");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [phone, setPhone] = useState(profileSnapshot?.account?.phone ?? "");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteBlockedOrgs, setDeleteBlockedOrgs] = useState<Array<{ id: string; name: string }> | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/profile", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Profil bilgileri yüklenemedi.");
      profileSnapshot = body;
      setData(body);
      setForm({ ...EMPTY_BILLING, ...(body.settings ?? {}) });
      setUsername(body.account?.username ?? "");
      setPhone(body.account?.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil bilgileri yüklenemedi.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const qrPercent = useMemo(() => {
    if (!data || data.plan.limits.max_qr === -1) return 0;
    return Math.min(100, Math.round((data.plan.usage.qr_count / Math.max(1, data.plan.limits.max_qr)) * 100));
  }, [data]);

  async function saveBilling() {
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await updateSettings(form);
      setForm({ ...EMPTY_BILLING, ...updated });
      setMessage("Fatura ve iletişim bilgileri güncellendi.");
    } catch (err) { setError(err instanceof Error ? err.message : "Bilgiler kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function saveUsername() {
    const value = username.trim();
    if (!/^[A-Za-z0-9_-]{3,12}$/.test(value)) {
      setError("Kullanıcı adı 3-12 karakter olmalı; yalnızca harf, rakam, alt çizgi ve tire kullanılabilir.");
      return;
    }
    setUsernameSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Kullanıcı adı güncellenemedi.");
      setUsername(body.profile.username);
      setData(current => current ? { ...current, account: { ...current.account, username: body.profile.username } } : current);
      setMessage("Kullanıcı adınız güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kullanıcı adı güncellenemedi.");
    } finally {
      setUsernameSaving(false);
    }
  }

  async function savePhone() {
    setPhoneSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Telefon numarası güncellenemedi.");
      setPhone(body.profile.phone ?? "");
      setData(current => current ? { ...current, account: { ...current.account, phone: body.profile.phone ?? null } } : current);
      setMessage("Telefon numaranız güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telefon numarası güncellenemedi.");
    } finally {
      setPhoneSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lütfen PNG, JPG veya WEBP formatında bir görsel seçin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profil fotoğrafı 5 MB'den küçük olmalı.");
      return;
    }

    setAvatarUploading(true); setError(""); setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile");

      const uploadResponse = await fetch("/api/v1/uploads", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const uploadBody = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || typeof uploadBody.url !== "string") {
        throw new Error(uploadBody.error || "Profil fotoğrafı yüklenemedi.");
      }

      const profileResponse = await fetch("/api/v1/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: uploadBody.url }),
      });
      const profileBody = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) throw new Error(profileBody.error || "Profil fotoğrafı kaydedilemedi.");

      const avatarUrl = profileBody.profile?.avatar_url ?? uploadBody.url;
      setData(current => current ? {
        ...current,
        account: { ...current.account, avatar_url: avatarUrl },
        settings: current.settings ? { ...current.settings, avatar_url: avatarUrl } : current.settings,
      } : current);
      await getSupabase().auth.updateUser({ data: { avatar_url: avatarUrl } }).catch(() => undefined);
      setMessage("Profil fotoğrafınız güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil fotoğrafı kaydedilemedi.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function sendPasswordReset() {
    if (!data?.account.email) return;
    setError(""); setMessage("");
    const origin = getPublicAppOrigin(window.location.origin);
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(data.account.email, { redirectTo: `${origin}/auth/reset` });
    if (resetError) setError(resetError.message);
    else setMessage("Şifre yenileme bağlantısı e-posta adresinize gönderildi.");
  }

  async function exportAccountData() {
    setExporting(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/account/export", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Veri exportu alınamadı.");
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qrpublish-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Verileriniz indirildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri exportu alınamadı.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== "SİL") return;
    setDeleting(true); setError(""); setDeleteBlockedOrgs(null);
    try {
      const response = await fetch("/api/v1/account", { method: "DELETE", credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409 && Array.isArray(body.organizations)) {
        setDeleteBlockedOrgs(body.organizations);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Hesap silinemedi.");
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hesap silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  async function openPortal() {
    if (data?.plan.key === "vip") {
      setError("VIP kullanıcılar abonelik yönetimi yapamaz. Bu paket manuel/özel olarak tanımlandığı için destek ile iletişime geçmelisiniz.");
      return;
    }
    setPortalLoading(true); setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "GET", credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || "Abonelik portalı açılamadı.");
      window.location.assign(body.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Abonelik portalı açılamadı."); }
    finally { setPortalLoading(false); }
  }

  const surface = isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const currentPlanTheme = planTheme(data?.plan.key);

  if (loading && !data) return <ProfileSkeleton isDark={isDark} />;

  return (
    <main className="min-h-full app-bg px-4 py-5 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className={`text-xs font-black uppercase tracking-wider ${muted}`}>Hesap Merkezi</p><h1 className="text-2xl font-black">Profil ve Faturalar</h1></div>
          <button onClick={() => void load()} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-black ${surface}`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Yenile</button>
        </header>

        {error && <Notice tone="error" icon={<AlertCircle size={18} />} text={error} />}
        {message && <Notice tone="success" icon={<CheckCircle2 size={18} />} text={message} />}

        {!data ? (
          <section className={`rounded-2xl border p-8 text-center ${surface}`}><p className="font-black">Profil bilgileri alınamadı.</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white">Tekrar Dene</button></section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <div className="space-y-5">
              <section className={`rounded-2xl border p-5 ${surface}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <UserAvatar
                        src={data.account.avatar_url}
                        user={data.account}
                        className="h-full w-full rounded-2xl"
                        fallbackClassName="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                      />
                      <label className="absolute inset-x-0 bottom-0 flex h-7 cursor-pointer items-center justify-center bg-slate-950/70 text-white transition hover:bg-slate-950/85" title="Profil fotoğrafı yükle">
                        {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        <input type="file" accept="image/*" className="sr-only" onChange={event => void uploadAvatar(event.target.files?.[0])} disabled={avatarUploading} />
                      </label>
                    </div>
                    <div className="min-w-0"><h2 className="truncate text-lg font-black">{data.account.full_name || "QR Publish Kullanıcısı"}</h2><p className={`truncate text-sm font-semibold ${muted}`}>{data.account.email}</p><p className={`mt-1 text-xs font-semibold ${muted}`}>Profil fotoğrafı ekleyebilir veya değiştirebilirsiniz.</p></div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">{data.account.email_verified ? "E-posta doğrulandı" : "Doğrulama bekliyor"}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Info icon={<ShieldCheck size={16} />} label="Rol" value={data.account.role.toUpperCase()} />
                  <Info icon={<CalendarDays size={16} />} label="Üyelik Tarihi" value={date(data.account.created_at)} />
                  <Info icon={<Mail size={16} />} label="Son Giriş" value={date(data.account.last_sign_in_at)} />
                  <button onClick={() => void sendPasswordReset()} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"><KeyRound size={16} className="text-violet-500" /><span><span className={`block text-[10px] font-black uppercase ${muted}`}>Güvenlik</span><span className="text-sm font-black">Şifre Yenileme Bağlantısı Gönder</span></span></button>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300" htmlFor="profile-username">Kullanıcı Adı</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input id="profile-username" value={username} onChange={event => setUsername(event.target.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12))} minLength={3} maxLength={12} autoComplete="username" placeholder="kullanici_adi" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10" />
                    <button type="button" onClick={() => void saveUsername()} disabled={usernameSaving || username === (data.account.username ?? "")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-40">{usernameSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Kaydet</button>
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${muted}`}>3-12 karakter; harf, rakam, alt çizgi ve tire.</p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <label className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300" htmlFor="profile-phone">Telefon Numarası</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input id="profile-phone" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+905551112233" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10" />
                    <button type="button" onClick={() => void savePhone()} disabled={phoneSaving || phone === (data.account.phone ?? "")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-40">{phoneSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Kaydet</button>
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${muted}`}>Ülke koduyla birlikte girin. Yeni rezervasyon/sipariş/geri bildirim geldiğinde ve admin panelden gönderilen SMS bildirimlerinde bu numara kullanılır.</p>
                </div>
              </section>

              <section className={`rounded-2xl border p-5 ${surface}`}>
                <div className="mb-5"><h2 className="text-lg font-black">Fatura Bilgileri</h2><p className={`mt-1 text-sm font-semibold ${muted}`}>Fatura kesiminde kullanılacak kurumsal ve iletişim bilgileri.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileInput label="Yetkili / Fatura Adı" value={form.billing_name} onChange={value => setForm(prev => ({ ...prev, billing_name: value }))} />
                  <ProfileInput label="Şirket Ünvanı" value={form.company_name} onChange={value => setForm(prev => ({ ...prev, company_name: value }))} />
                  <ProfileInput label="Vergi Dairesi" value={form.tax_office} onChange={value => setForm(prev => ({ ...prev, tax_office: value }))} />
                  <ProfileInput label="Vergi / T.C. No" value={form.tax_number} onChange={value => setForm(prev => ({ ...prev, tax_number: value }))} />
                  <ProfileInput label="Fatura E-postası" type="email" value={form.invoice_email} onChange={value => setForm(prev => ({ ...prev, invoice_email: value }))} />
                  <ProfileInput label="Şehir" value={form.billing_city} onChange={value => setForm(prev => ({ ...prev, billing_city: value }))} />
                  <ProfileInput label="Ülke" value={form.billing_country} onChange={value => setForm(prev => ({ ...prev, billing_country: value }))} />
                  <ProfileInput label="Bildirim E-postası" type="email" value={form.notification_email} onChange={value => setForm(prev => ({ ...prev, notification_email: value }))} />
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">Fatura Adresi</span><textarea value={form.billing_address ?? ""} onChange={event => setForm(prev => ({ ...prev, billing_address: event.target.value }))} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10" /></label>
                </div>
                <button onClick={() => void saveBilling()} disabled={saving} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Bilgileri Kaydet</button>
              </section>

              <section className={`rounded-2xl border p-5 ${surface}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"><ShieldAlert size={20} /></div>
                  <div><h2 className="text-lg font-black">Hesap ve Gizlilik</h2><p className={`mt-1 text-sm font-semibold ${muted}`}>KVKK/GDPR kapsamında verilerinizi indirebilir veya hesabınızı kalıcı olarak silebilirsiniz.</p></div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                  <div><p className="text-sm font-black">Verilerimi indir</p><p className={`text-xs font-semibold ${muted}`}>Profil, QR'lar, taramalar, sipariş/rezervasyon/geri bildirim verilerinizin JSON dökümü.</p></div>
                  <button onClick={() => void exportAccountData()} disabled={exporting} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10">{exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} İndir</button>
                </div>

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-black text-red-700 dark:text-red-300">Hesabımı kalıcı olarak sil</p><p className={`text-xs font-semibold ${muted}`}>Tüm QR'larınız, klasörleriniz, mesajlarınız ve profiliniz geri alınamaz şekilde silinir.</p></div>
                    {!deleteOpen && (
                      <button onClick={() => setDeleteOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500">
                        <Trash2 size={15} /> Hesabımı Sil
                      </button>
                    )}
                  </div>

                  {deleteOpen && !deleteBlockedOrgs && (
                    <div className="mt-4 space-y-3 border-t border-red-200 pt-4 dark:border-red-500/20">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Onaylamak için kutuya <strong>SİL</strong> yazın. Bu işlem geri alınamaz.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={deleteConfirmText}
                          onChange={event => setDeleteConfirmText(event.target.value)}
                          placeholder="SİL"
                          className="h-11 w-full max-w-[200px] rounded-xl border border-red-200 bg-white px-3 text-sm font-black uppercase outline-none focus:border-red-500 dark:border-red-500/30 dark:bg-transparent"
                        />
                        <button
                          onClick={() => void deleteAccount()}
                          disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "SİL"}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Evet, Kalıcı Olarak Sil
                        </button>
                        <button onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); }} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10">Vazgeç</button>
                      </div>
                    </div>
                  )}

                  {deleteBlockedOrgs && (
                    <div className="mt-4 space-y-2 border-t border-red-200 pt-4 dark:border-red-500/20">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Başka aktif üyesi bulunan şu organizasyon(lar)a sahipsiniz. Hesabınızı silmeden önce sahipliği devredin veya organizasyonu silin:
                      </p>
                      <ul className="list-inside list-disc text-sm font-semibold">
                        {deleteBlockedOrgs.map(org => <li key={org.id}>{org.name}</li>)}
                      </ul>
                      <Link href="/dashboard/organizations" className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500">Organizasyonlara Git</Link>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
              <section className={`overflow-hidden rounded-2xl border p-5 text-slate-950 shadow-xl dark:text-white ${currentPlanTheme.card}`}>
                <div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-black uppercase tracking-wider ${currentPlanTheme.accentText}`}>Mevcut Paket</p><h2 className="mt-1 text-3xl font-black">{data.plan.label}</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{data.plan.status_label} · {planExpiryLabel(data.plan.key, data.plan.expires_at)}</p></div><Gauge className={currentPlanTheme.accentText} /></div>
                <div className="mt-6"><div className="flex justify-between text-xs font-black"><span>QR Kullanımı</span><span>{usageLimitLabel(data.plan.usage.qr_count, data.plan.limits.max_qr, "QR")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r ${currentPlanTheme.progress}`} style={{ width: data.plan.limits.max_qr === -1 ? "100%" : `${qrPercent}%` }} /></div></div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs"><Limit label="Aylık Tarama" value={limitLabel(data.plan.limits.max_monthly_scans)} /><Limit label="Analitik" value={`${data.plan.limits.analytics_days} gün`} /><Limit label="Şablon" value={limitLabel(data.plan.limits.styles)} /><Limit label="Ekip Üyesi" value={limitLabel(data.plan.limits.org_members, "kullanıcı")} /><Limit label="Özel Alan Adı" value={data.plan.limits.custom_domain ? "Dahil" : "Yok"} /></div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><Link href="/pricing" className="flex h-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-black hover:bg-violet-500">Paketi Yükselt</Link><button onClick={() => void openPortal()} disabled={portalLoading || (!data.subscription && data.plan.key !== "vip")} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-black hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">{portalLoading && <Loader2 size={14} className="animate-spin" />} Aboneliği Yönet</button></div>
              </section>

            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function ProfileSkeleton({ isDark }: { isDark: boolean }) {
  const surface = isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white";
  const pulse = isDark ? "bg-white/10" : "bg-slate-200";

  return (
    <main className="min-h-full app-bg px-4 py-5 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className={`h-3 w-28 animate-pulse rounded ${pulse}`} />
            <div className={`h-8 w-56 animate-pulse rounded-xl ${pulse}`} />
          </div>
          <div className={`h-10 w-24 animate-pulse rounded-xl ${pulse}`} />
        </header>
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {[0, 1, 2].map((item) => (
              <section key={item} className={`rounded-2xl border p-5 ${surface}`}>
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 animate-pulse rounded-2xl ${pulse}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-5 w-44 animate-pulse rounded ${pulse}`} />
                    <div className={`h-4 w-2/3 animate-pulse rounded ${pulse}`} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className={`h-11 animate-pulse rounded-xl ${pulse}`} />
                  <div className={`h-11 animate-pulse rounded-xl ${pulse}`} />
                </div>
              </section>
            ))}
          </div>
          <aside className="space-y-5">
            <section className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="space-y-3">
                <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                <div className="h-9 w-36 animate-pulse rounded-xl bg-white/10" />
                <div className="h-2 w-full animate-pulse rounded-full bg-white/10" />
              </div>
            </section>
            <section className={`rounded-2xl border p-5 ${surface}`}>
              <div className={`h-20 animate-pulse rounded-xl ${pulse}`} />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProfileInput({ label, value, onChange, type = "text" }: { label: string; value?: string | null; onChange: (value: string) => void; type?: string }) { return <label><span className="mb-1.5 block text-xs font-black text-slate-600 dark:text-slate-300">{label}</span><input type={type} value={value ?? ""} onChange={event => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10" /></label>; }
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5"><span className="text-violet-500">{icon}</span><span><span className="block text-[10px] font-black uppercase text-slate-400">{label}</span><span className="text-sm font-black">{value}</span></span></div>; }
function Notice({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: "error" | "success" }) { return <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>{icon}{text}</div>; }
function Limit({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/5 p-3"><span className="block text-[10px] font-black uppercase text-slate-400">{label}</span><span className="mt-1 block font-black">{value}</span></div>; }
function PaymentStatus({ status }: { status: string }) { const ok = /success|recovered/i.test(status); const failed = /failed|refunded/i.test(status); return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : failed ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{ok ? "Ödendi" : failed ? "Başarısız / İade" : status}</span>; }
function date(value?: string | null) { if (!value) return "-"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }); }
function money(amount?: number | null, currency?: string | null) { if (amount == null) return "-"; return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(amount / 100); }

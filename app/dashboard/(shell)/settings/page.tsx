"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CreditCard,
  Crown,
  FileText,
  Globe2,
  HelpCircle,
  Loader2,
  PlugZap,
  Save,
  Settings,
  Webhook,
} from "lucide-react";
import {
  getOrCreateSettings,
  updateSettings,
  type UserSettings,
} from "@/lib/supabase";

type PlanInfo = {
  plan: string;
  plan_label: string;
  status: string;
  status_label: string;
  expires_at: string | null;
  days_left: number | null;
  grace_days_left: number | null;
};

type DomainState = "idle" | "pending" | "verified" | "error";
type ServerProvisionStatus = "not_started" | "provisioning" | "provisioned" | "failed" | null;
type DnsInstructions = { host: string; value: string } | null;

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [domainState, setDomainState] = useState<DomainState>("idle");
  const [domainMessage, setDomainMessage] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions>(null);
  const [serverStatus, setServerStatus] = useState<ServerProvisionStatus>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    getOrCreateSettings()
      .then((row) => {
        if (alive) setSettings(row);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Ayarlar yüklenemedi.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    fetch("/api/v1/plan", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((row) => {
        if (alive && row && !row.error) setPlanInfo(row);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  async function openBillingPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body?.url !== "string") {
        throw new Error(typeof body?.error === "string" ? body.error : "Portal bağlantısı hazırlanamadı.");
      }
      window.location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal bağlantısı hazırlanamadı.");
    } finally {
      setPortalLoading(false);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateSettings({
        custom_domain: cleanDomain(settings.custom_domain),
        ga4_measurement_id: emptyToNull(settings.ga4_measurement_id),
        gtm_container_id: emptyToNull(settings.gtm_container_id),
        webhook_url: emptyToNull(settings.webhook_url),
        billing_name: emptyToNull(settings.billing_name),
        company_name: emptyToNull(settings.company_name),
        tax_office: emptyToNull(settings.tax_office),
        tax_number: emptyToNull(settings.tax_number),
        invoice_email: emptyToNull(settings.invoice_email),
        billing_address: emptyToNull(settings.billing_address),
        billing_city: emptyToNull(settings.billing_city),
        billing_country: emptyToNull(settings.billing_country),
        payment_method_label: emptyToNull(settings.payment_method_label),
        notification_email: emptyToNull(settings.notification_email),
        security_contact_email: emptyToNull(settings.security_contact_email),
      });
      setSettings(updated);
      setMessage("Kaydedildi");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function verifyCustomDomain() {
    const domain = cleanDomain(settings?.custom_domain);
    if (!domain) {
      setDomainState("error");
      setDomainMessage("Önce bir alan adı girin.");
      return;
    }

    setDomainLoading(true);
    setDomainMessage("");
    setServerStatus(null);
    setServerError(null);
    try {
      // 1) Bu domain icin daha once acilmis bir kayit var mi bak; yoksa
      // olustur (bu adim TXT dogrulama token'ini uretir).
      const listResponse = await fetch("/api/v1/custom-domains", { credentials: "same-origin", cache: "no-store" });
      const listBody = await listResponse.json().catch(() => ({}));
      const existing = Array.isArray(listBody?.domains)
        ? listBody.domains.find((d: { domain?: string }) => d.domain === domain)
        : null;

      let record = existing;
      if (!record) {
        const createResponse = await fetch("/api/v1/custom-domains", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        const createBody = await createResponse.json().catch(() => ({}));
        if (!createResponse.ok) {
          setDomainState("error");
          setDomainMessage(typeof createBody?.error === "string" ? createBody.error : "Alan adı kaydedilemedi.");
          return;
        }
        record = createBody.domain;
        if (createBody.dns_instructions) {
          setDnsInstructions({ host: createBody.dns_instructions.host, value: createBody.dns_instructions.value });
        }
      } else {
        setDnsInstructions({ host: `_qrpublish-verify.${domain}`, value: record.verification_token });
      }

      if (!record?.id) {
        setDomainState("error");
        setDomainMessage("Alan adı kaydı oluşturulamadı.");
        return;
      }

      // 2) Gercek DNS TXT kontrolunu calistir.
      const verifyResponse = await fetch(`/api/v1/custom-domains/${record.id}/verify`, {
        method: "POST",
        credentials: "same-origin",
      });
      const verifyBody = await verifyResponse.json().catch(() => ({}));
      const verified = Boolean(verifyBody?.verified);
      setDomainState(verified ? "verified" : "pending");
      setDomainMessage(
        verified
          ? "DNS doğrulandı."
          : typeof verifyBody?.error === "string"
            ? verifyBody.error
            : "DNS kayıtları henüz eşleşmedi."
      );
      setServerStatus(verifyBody?.domain?.server_status ?? null);
      setServerError(verifyBody?.domain?.server_error ?? null);
    } catch {
      setDomainState("error");
      setDomainMessage("Alan adı doğrulama şu anda yapılamıyor.");
    } finally {
      setDomainLoading(false);
    }
  }

  async function testWebhook() {
    const webhookUrl = emptyToNull(settings?.webhook_url);
    if (!webhookUrl) {
      setError("Test gönderimi için bir webhook URL girin.");
      return;
    }

    setIntegrationLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/v1/integrations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Test payload gönderilemedi.");
      }
      setMessage(typeof body.message === "string" ? body.message : "Test payload gönderildi.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Webhook testi başarısız.");
    } finally {
      setIntegrationLoading(false);
    }
  }

  const pageBg = "min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-[#020617] dark:text-slate-100 dark:placeholder:text-slate-600";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-full w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Dashboard</p>
            <h1 className="text-2xl font-black tracking-tight">Ayarlar</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!settings || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Kaydet
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check size={16} />
            {message}
          </div>
        )}

        {loading ? (
          <div className={`${panel} flex h-64 items-center justify-center`}>
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : (
          <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={`${panel} p-5 lg:col-span-2`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                  <Crown size={20} />
                </div>
                <div>
                  <h2 className="font-black">Abonelik</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Mevcut paketiniz, kalan süre ve fatura yönetimi.</p>
                </div>
              </div>

              {!planInfo ? (
                <div className={`flex h-16 items-center text-sm ${subtle}`}>
                  <Loader2 className="mr-2 animate-spin" size={16} /> Yükleniyor...
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className="rounded-xl bg-violet-100 px-3 py-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {planInfo.plan_label}
                    </span>
                    <span
                      className={`rounded-xl px-3 py-2 ${
                        planInfo.status === "active" || planInfo.status === "free" || planInfo.status === "trial"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                          : planInfo.status === "expired" || planInfo.status === "past_due"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      }`}
                    >
                      {planInfo.status_label}
                    </span>
                    {typeof planInfo.days_left === "number" && planInfo.plan !== "free" && (
                      <span className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                        Kalan süre: {planInfo.days_left} gün
                      </span>
                    )}
                    {planInfo.expires_at && formatDate(planInfo.expires_at) && (
                      <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        Yenileme: {formatDate(planInfo.expires_at)}
                      </span>
                    )}
                    {planInfo.status === "expired" && typeof planInfo.grace_days_left === "number" && (
                      <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        Ek süre: {planInfo.grace_days_left} gün
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {planInfo.plan === "free" ? (
                      <a
                        href="/pricing"
                        className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-500"
                      >
                        Paketi Yükselt
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void openBillingPortal()}
                        disabled={portalLoading}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                      >
                        {portalLoading ? "Hazırlanıyor..." : "Aboneliği Yönet"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <Globe2 size={20} />
                  </div>
                  <div>
                    <h2 className="font-black">Özel marka alan adı</h2>
                    <p className={`mt-1 text-sm ${subtle}`}>QR linkleri için kullanılacak alan adını kaydedin ve doğrulama durumunu izleyin.</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/help/custom-domain"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08]"
                >
                  <HelpCircle size={14} />
                  Nasıl kurulur?
                </Link>
              </div>
              <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Özel Alan Adı</label>
              <input
                value={settings?.custom_domain ?? ""}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, custom_domain: e.target.value } : prev)}
                placeholder="q.sirketiniz.com"
                className={`${input} font-mono`}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void verifyCustomDomain()}
                  disabled={domainLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {domainLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Doğrula
                </button>
                <span className={`rounded-xl px-3 py-2 text-xs font-black ${
                  domainState === "verified"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : domainState === "pending"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : domainState === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                }`}>
                  DNS: {domainState === "verified" ? "Doğrulandı" : domainState === "pending" ? "Bekliyor" : domainState === "error" ? "Hata" : "Hazır değil"}
                </span>
                {domainState === "verified" && (
                  <span className={`rounded-xl px-3 py-2 text-xs font-black ${
                    serverStatus === "provisioned"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : serverStatus === "failed"
                        ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}>
                    Sunucu: {serverStatus === "provisioned" ? "Aktif" : serverStatus === "failed" ? "Kurulamadı" : "Kuruluyor"}
                  </span>
                )}
              </div>
              <p className={`mt-2 text-xs ${subtle}`}>{domainMessage || "Önce aşağıdaki TXT kaydını DNS sağlayıcınızda oluşturun, sonra Doğrula'ya basın."}</p>
              {serverError && (
                <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">{serverError}</p>
              )}
              {dnsInstructions && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                  <p className={`font-bold uppercase tracking-widest ${subtle}`}>Eklemeniz gereken TXT kaydı</p>
                  <div className="mt-2 grid gap-1 font-mono">
                    <span>Host: {dnsInstructions.host}</span>
                    <span className="break-all">Değer: {dnsInstructions.value}</span>
                  </div>
                  <p className={`mt-2 ${subtle}`}>
                    Adım adım talimat için{" "}
                    <Link href="/dashboard/help/custom-domain" className="font-bold text-violet-600 underline dark:text-violet-300">
                      kurulum rehberine
                    </Link>{" "}
                    bakın.
                  </p>
                </div>
              )}
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <Webhook size={20} />
                </div>
                <div>
                  <h2 className="font-black">İzleme varsayılanları</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Yeni QR'larda kullanmak üzere entegrasyon ID'lerini tutun.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>GA4 Measurement ID</label>
                  <input
                    value={settings?.ga4_measurement_id ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, ga4_measurement_id: e.target.value } : prev)}
                    placeholder="G-XXXXXXXXXX"
                    className={`${input} font-mono`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>GTM Container ID</label>
                  <input
                    value={settings?.gtm_container_id ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, gtm_container_id: e.target.value } : prev)}
                    placeholder="GTM-XXXXXXX"
                    className={`${input} font-mono`}
                  />
                </div>
              </div>
            </section>

            <section className={`${panel} p-5 lg:col-span-2`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                  <PlugZap size={20} />
                </div>
                <div>
                  <h2 className="font-black">Entegrasyonlar</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Zapier, Make veya kendi webhook hedeflerinize örnek olay gönderin.</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {["Webhook URL", "Zapier", "Make", "Google Sheets"].map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
              <label className={`block text-xs font-bold uppercase tracking-widest ${subtle}`}>Webhook URL</label>
              <input
                value={settings?.webhook_url ?? ""}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, webhook_url: e.target.value } : prev)}
                placeholder="https://example.com/webhook"
                className={`${input} font-mono`}
              />
              <p className={`mt-2 text-xs ${subtle}`}>
                Beklenen payload: <span className="font-mono">qr_scan, qr_id, slug, device, os, country</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void testWebhook()}
                  disabled={integrationLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/[0.08]"
                >
                  {integrationLoading ? <Loader2 size={15} className="animate-spin" /> : <Webhook size={15} />}
                  Test Gönder
                </button>
              </div>
            </section>

            <section className={`${panel} p-5 lg:col-span-2`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-black">Fatura Bilgileri</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Abonelik faturaları ve kurumsal teklif süreçleri için kullanılacak bilgiler.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["billing_name", "Yetkili / Fatura Adı", "Erhan Algül"],
                  ["company_name", "Şirket Unvanı", "QR Publish A.Ş."],
                  ["tax_office", "Vergi Dairesi", "Kadıköy"],
                  ["tax_number", "Vergi / TCKN No", "1234567890"],
                  ["invoice_email", "Fatura E-postası", "muhasebe@sirket.com"],
                  ["billing_city", "Şehir", "İstanbul"],
                  ["billing_country", "Ülke", "Türkiye"],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>{label}</label>
                    <input
                      value={(settings?.[key as keyof UserSettings] as string | null | undefined) ?? ""}
                      onChange={(e) => setSettings((prev) => prev ? { ...prev, [key]: e.target.value } as UserSettings : prev)}
                      placeholder={placeholder}
                      className={input}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Fatura Adresi</label>
                  <textarea
                    value={settings?.billing_address ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, billing_address: e.target.value } : prev)}
                    placeholder="Açık adres"
                    rows={3}
                    className={`${input} resize-none`}
                  />
                </div>
              </div>
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="font-black">Ödeme Bilgileri</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Kart altyapısı bağlanana kadar ödeme yöntemi notu olarak tutulur.</p>
                </div>
              </div>
              <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Ödeme Yöntemi</label>
              <input
                value={settings?.payment_method_label ?? ""}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, payment_method_label: e.target.value } : prev)}
                placeholder="Örn: Havale, Kurumsal kart, Stripe"
                className={input}
              />
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                Online kart saklama için kart verisi uygulamada tutulmaz; ödeme sağlayıcı kasasında saklanır.
              </div>
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="font-black">Bildirim ve Güvenlik</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Operasyon ve güvenlik e-postaları için ayrı adresler tanımlayın.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Bildirim E-postası</label>
                  <input
                    value={settings?.notification_email ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, notification_email: e.target.value } : prev)}
                    placeholder="operasyon@sirket.com"
                    className={input}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Güvenlik E-postası</label>
                  <input
                    value={settings?.security_contact_email ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, security_contact_email: e.target.value } : prev)}
                    placeholder="security@sirket.com"
                    className={input}
                  />
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

function emptyToNull(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function cleanDomain(value?: string | null) {
  const clean = value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return clean ? clean : null;
}

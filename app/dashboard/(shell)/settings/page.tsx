"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Crown,
  FileText,
  Globe2,
  HelpCircle,
  Loader2,
  PlugZap,
  Save,
  SearchCheck,
  Settings,
  Webhook,
} from "lucide-react";
import {
  getOrCreateSettings,
  updateSettings,
  type UserSettings,
} from "@/lib/supabase";
import MfaSettingsCard from "@/components/dashboard/MfaSettingsCard";
import ApiKeysCard from "@/components/dashboard/ApiKeysCard";
import { useToast } from "@/components/toast";
import { planExpiryLabel, planTheme } from "@/lib/plan-ui";

type PlanInfo = {
  plan: string;
  plan_label: string;
  status: string;
  status_label: string;
  expires_at: string | null;
  days_left: number | null;
  grace_days_left: number | null;
  entitlement_plan?: string;
  limits?: {
    max_qr: number;
    max_menu_qr: number;
    max_vcard_pages: number;
    max_monthly_scans: number;
    org_members: number;
    max_white_label_domains: number;
  };
};

function formatPlanLimit(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value === -1) return "Sınırsız";
  return new Intl.NumberFormat("tr-TR").format(value);
}

type DomainState = "idle" | "pending" | "verified" | "error";
type ServerProvisionStatus = "not_started" | "provisioning" | "provisioned" | "failed" | null;
type DnsInstructions = { host: string; value: string } | null;
type SeoAuditResult = {
  url: string;
  status: number;
  score: number;
  bytes: number;
  redirects: number;
  elapsedMs: number;
  fields: { title: string; description: string; canonical: string; robots: string; lang: string; h1: string[]; ogTitle: string; ogDescription: string; viewport: string; structuredDataCount: number };
  checks: Array<{ key: string; label: string; status: "pass" | "warning" | "fail"; message: string }>;
};

export default function SettingsPage() {
  const toast = useToast();
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
  const [seoUrl, setSeoUrl] = useState("https://qrpublish.com");
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState("");
  const [seoResult, setSeoResult] = useState<SeoAuditResult | null>(null);

  useEffect(() => {
    let alive = true;

    getOrCreateSettings()
      .then((row) => {
        if (!alive) return;
        setSettings(row);
        // Pre-populate domain state from existing DB record so users don't see
        // "Hazır değil" for a domain that is already verified.
        const domain = cleanDomain(row?.custom_domain);
        if (domain) {
          fetch("/api/v1/custom-domains", { credentials: "same-origin", cache: "no-store" })
            .then((r) => r.json())
            .then((body) => {
              if (!alive) return;
              const existing = Array.isArray(body?.domains)
                ? body.domains.find((d: { domain?: string; status?: string }) => d.domain === domain)
                : null;
              if (existing?.status === "verified") setDomainState("verified");
              else if (existing?.status === "failed" || existing?.status === "pending") setDomainState("pending");
            })
            .catch(() => {});
        }
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
    if (planInfo?.plan === "vip") {
      const vipMessage = "VIP kullanıcılar abonelik yönetimi yapamaz. Bu paket manuel/özel olarak tanımlandığı için destek ile iletişime geçmelisiniz.";
      setError(vipMessage);
      toast.info(vipMessage, "Abonelik yönetimi");
      return;
    }
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
      const portalMsg = e instanceof Error ? e.message : "Portal bağlantısı hazırlanamadı.";
      setError(portalMsg);
      toast.error(portalMsg);
    } finally {
      setPortalLoading(false);
    }
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
        notification_email: emptyToNull(settings.notification_email),
        security_contact_email: emptyToNull(settings.security_contact_email),
      });
      setSettings(updated);
      setMessage("Kaydedildi");
      toast.success("Ayarlar kaydedildi.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      const saveMsg = e instanceof Error ? e.message : "Ayarlar kaydedilemedi.";
      setError(saveMsg);
      toast.error(saveMsg);
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

  async function runSeoTest() {
    if (seoLoading) return;
    setSeoLoading(true);
    setSeoError("");
    setSeoResult(null);
    try {
      const response = await fetch("/api/v1/seo-audit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: seoUrl }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.result) throw new Error(body.error || "URL analiz edilemedi.");
      setSeoResult(body.result);
    } catch (error) {
      setSeoError(error instanceof Error ? error.message : "URL analiz edilemedi.");
    } finally {
      setSeoLoading(false);
    }
  }

  const pageBg = "min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-[#020617] dark:text-slate-100 dark:placeholder:text-slate-600";
  const subtle = "text-slate-500 dark:text-slate-400";
  const currentPlanTheme = planTheme(planInfo?.plan ?? settings?.current_plan);

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
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ${currentPlanTheme.icon}`}>
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
                    <span className={`rounded-xl px-3 py-2 ${currentPlanTheme.badge}`}>
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
                    <span className={`rounded-xl px-3 py-2 ${currentPlanTheme.badge}`}>
                      {planExpiryLabel(planInfo.plan, planInfo.expires_at)}
                    </span>
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

              {planInfo && (planInfo.entitlement_plan ?? planInfo.plan) === "enterprise" && planInfo.limits ? (
                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.06]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
                    Kurumsal paketiniz
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      ["Toplam QR", planInfo.limits.max_qr],
                      ["Menü QR", planInfo.limits.max_menu_qr],
                      ["vCard / Multi URL", planInfo.limits.max_vcard_pages],
                      ["Aylık scan", planInfo.limits.max_monthly_scans],
                      ["Takım / alt hesap", planInfo.limits.org_members],
                      ["White-label domain", planInfo.limits.max_white_label_domains],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg bg-white/70 px-3 py-2 dark:bg-white/[0.04]">
                        <p className={`text-[11px] font-bold ${subtle}`}>{label}</p>
                        <p className="mt-0.5 text-sm font-black">{formatPlanLimit(value as number)}</p>
                      </div>
                    ))}
                  </div>
                  <p className={`mt-3 text-xs ${subtle}`}>
                    Limitleri değiştirmek için satış ekibiyle görüşün. Ödeme ve iptal işlemleri “Aboneliği Yönet” ile Lemon Squeezy portalından yapılır.
                  </p>
                </div>
              ) : null}
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
                  <p className={`mt-1 text-sm ${subtle}`}>Yeni QR&apos;larda kullanmak üzere entegrasyon ID&apos;lerini tutun.</p>
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
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>GTM CONTAINER ID</label>
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <SearchCheck size={20} />
                </div>
                <div>
                  <h2 className="font-black">SEO URL Testi</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Public bir sayfanın temel metadata ve indeksleme sinyallerini güvenli sunucu isteğiyle kontrol edin.</p>
                </div>
              </div>
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); void runSeoTest(); }}>
                <div className="min-w-0 flex-1">
                  <label htmlFor="seo-audit-url" className="sr-only">Test edilecek public URL</label>
                  <input id="seo-audit-url" type="url" required value={seoUrl} onChange={event => setSeoUrl(event.target.value)} placeholder="https://example.com/sayfa" className={`${input} mt-0 font-mono`} />
                </div>
                <button type="submit" disabled={seoLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
                  {seoLoading ? <Loader2 size={16} className="animate-spin" /> : <SearchCheck size={16} />}
                  {seoLoading ? "Analiz ediliyor" : "SEO Testini Çalıştır"}
                </button>
              </form>
              <p className={`mt-2 text-xs ${subtle}`}>Yalnız standart public HTTP/HTTPS adresleri; 8 sn, 3 redirect ve 1 MB sınırı. Araç JavaScript çalıştırmaz ve sıralama garantisi vermez.</p>
              {seoError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">{seoError}</p>}
              {seoResult && (
                <div className="mt-4 space-y-4" aria-live="polite">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-xl px-4 py-2 text-sm font-black ${seoResult.score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : seoResult.score >= 55 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200"}`}>Teknik skor: {seoResult.score}/100</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">HTTP {seoResult.status}</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{seoResult.redirects} redirect · {(seoResult.bytes / 1024).toFixed(1)} KB · {seoResult.elapsedMs} ms</span>
                  </div>
                  <p className="break-all font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{seoResult.url}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {seoResult.checks.map(check => (
                      <div key={check.key} className={`rounded-xl border p-3 ${check.status === "pass" ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]" : check.status === "warning" ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]" : "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/[0.06]"}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-black">{check.label}</span><span className="text-[10px] font-black uppercase">{check.status === "pass" ? "Geçti" : check.status === "warning" ? "Kontrol" : "Eksik"}</span></div>
                        <p className={`mt-1 break-words text-xs ${subtle}`}>{check.message}</p>
                      </div>
                    ))}
                  </div>
                  <details className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <summary className="cursor-pointer text-sm font-black">Bulunan metadata</summary>
                    <dl className="mt-3 grid gap-2 text-xs">
                      <div><dt className="font-black text-slate-500">Title</dt><dd className="break-words">{seoResult.fields.title || "—"}</dd></div>
                      <div><dt className="font-black text-slate-500">Description</dt><dd className="break-words">{seoResult.fields.description || "—"}</dd></div>
                      <div><dt className="font-black text-slate-500">Canonical</dt><dd className="break-all">{seoResult.fields.canonical || "—"}</dd></div>
                      <div><dt className="font-black text-slate-500">Robots</dt><dd className="break-words">{seoResult.fields.robots || "—"}</dd></div>
                      <div><dt className="font-black text-slate-500">H1</dt><dd className="break-words">{seoResult.fields.h1.join(" | ") || "—"}</dd></div>
                    </dl>
                  </details>
                </div>
              )}
            </section>

            <section className={`${panel} p-5 lg:col-span-2`}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                  <PlugZap size={20} />
                </div>
                <div>
                  <h2 className="font-black">Entegrasyonlar</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Genel webhook URL&apos;iniz üzerinden Zapier, Make, Google Sheets gibi araçlara veya kendi sisteminize olay gönderin.</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  Webhook URL
                </span>
                <span className={`text-xs ${subtle}`}>ile uyumlu:</span>
                {["Zapier", "Make", "Google Sheets"].map((item) => (
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="font-black">Bildirim ve Güvenlik</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>Operasyon bildirimleri ve güvenlik uyarıları için ayrı e-posta adresleri tanımlayın.</p>
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
                  <p className={`mt-1.5 text-xs ${subtle}`}>Menü siparişi, rezervasyon, geri bildirim ve sahip bildirimlerinde bu adres öncelikli kullanılır.</p>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Güvenlik E-postası</label>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">Yakında</span>
                  <input
                    value={settings?.security_contact_email ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, security_contact_email: e.target.value } : prev)}
                    placeholder="security@sirket.com"
                    className={input}
                  />
                  <p className={`mt-1.5 text-xs ${subtle}`}>Adres kaydedilir; MFA ve kritik güvenlik uyarıları otomatikleştirildiğinde bu kanal kullanılacak.</p>
                </div>
              </div>
            </section>

            <MfaSettingsCard panelClass={panel} subtleClass={subtle} inputClass={input} />
            <ApiKeysCard panelClass={panel} subtleClass={subtle} inputClass={input} />
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

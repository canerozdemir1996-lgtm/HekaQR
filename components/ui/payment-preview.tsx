"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { buildCheckoutPlanKey } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type PreviewLocale = "tr" | "en";
type BillingCycle = "monthly" | "yearly";

type PricingPaymentPreviewProps = {
  locale: PreviewLocale;
  billing: BillingCycle;
  selectedPlanKey: string;
  planName: string;
  planDescription: string;
  unitPrice: number;
  formatPrice: (amount: number) => string;
  bullets?: string[];
};

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open?: (url: string) => void;
      };
    };
    createLemonSqueezy?: () => void;
  }
}

function getCopy(locale: PreviewLocale, billing: BillingCycle) {
  const isTr = locale === "tr";
  return {
    badge: isTr ? "Guvenli odeme" : "Secure checkout",
    title: isTr
      ? "Odeme Lemon Squeezy uzerinden tamamlanir."
      : "Payments are completed through Lemon Squeezy.",
    text: isTr
      ? "Kart bilgileri uygulamamiz tarafinda goruntulenmez veya saklanmaz. Plan ozeti bu ekranda kalir, hassas odeme adimi Lemon Squeezy overlay'inde ilerler."
      : "Your card details are never collected or stored inside our app. The plan summary stays here while the sensitive payment step continues in Lemon Squeezy's overlay.",
    secureTitle: isTr ? "Guvenli odeme" : "Secure payment",
    secureText: isTr
      ? "Abonelik urunlerinde Lemon Squeezy su an kartlar, Apple Pay, Google Pay ve PayPal'i destekler. Uygun ulke ve cihazlarda mevcut yontemler odeme ekraninda otomatik gorunur."
      : "For subscription products, Lemon Squeezy currently supports cards, Apple Pay, Google Pay, and PayPal. The checkout automatically shows the methods available for the shopper's device and region.",
    methodHint: isTr ? "Odeme yontemleri uygunluk durumuna gore gosterilir." : "Payment methods appear based on availability.",
    securityItems: isTr
      ? [
          "Kart verisi sadece Lemon Squeezy checkout ekraninda islenir.",
          "Webhook dogrulamasi ile abonelik panelde sunucu tarafinda etkinlesir.",
          "Odeme tamamlandiginda dashboard durumunuz otomatik yenilenir.",
        ]
      : [
          "Card data is handled only inside Lemon Squeezy's checkout.",
          "Webhook verification activates the subscription on the server side.",
          "Your dashboard refreshes automatically once the payment is synced.",
        ],
    journeyTitle: isTr ? "Odeme akisi" : "Billing journey",
    steps: isTr
      ? [
          "Plan ve faturalama periyodu burada dogrulanir.",
          "Guvenli odeme overlay'i yeni sekme acmadan baslatilir.",
          "Webhook geldikten sonra abonelik ve yetkileriniz panelde guncellenir.",
        ]
      : [
          "Your plan and billing cadence are confirmed here.",
          "The secure payment overlay opens without leaving the page.",
          "Once the webhook arrives, your subscription and entitlements update in the dashboard.",
        ],
    summary: isTr ? "Plan Ozeti" : "Order summary",
    included: isTr ? "Plana dahil" : "Included with the plan",
    subtotal: isTr ? "Ara toplam" : "Subtotal",
    tax: isTr ? "Vergi" : "Tax",
    total: isTr ? "Toplam" : "Total",
    taxHint: isTr ? "Vergiler odeme ekraninda hesaplanir." : "Taxes are calculated in the checkout.",
    totalHint: isTr ? "Toplam odeme ekraninda kesinlesir." : "The final total is confirmed in the checkout.",
    button: isTr ? "Guvenli odemeye gec" : "Continue to secure payment",
    loading: isTr ? "Odeme hazirlaniyor..." : "Preparing secure payment...",
    loginNeeded: isTr ? "Devam etmek icin giris yapmalisiniz." : "You need to log in before continuing.",
    invalidPlan: isTr ? "Gecerli bir paket secin." : "Please choose a valid plan.",
    loadFallback: isTr
      ? "Overlay hemen yuklenmezse sizi Lemon Squeezy'nin hosted checkout sayfasina yonlendiririz."
      : "If the overlay is not ready, you will be redirected to Lemon Squeezy's hosted checkout.",
    sessionNotice: billing === "yearly"
      ? (isTr ? "Yillik faturalama secildi" : "Yearly billing selected")
      : (isTr ? "Aylik faturalama secildi" : "Monthly billing selected"),
    managedBy: isTr ? "Odeme Lemon Squeezy tarafindan guvenle islenir" : "Payments are securely processed by Lemon Squeezy",
  };
}

function buildLoginHref(selectedPlanKey: string, billing: BillingCycle) {
  return `/login?next=/pricing/checkout?plan=${encodeURIComponent(selectedPlanKey)}&billing=${billing}`;
}

function methodPill(label: string) {
  return (
    <span
      key={label}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
    >
      {label}
    </span>
  );
}

function openLemonOverlay(url: string) {
  if (typeof window === "undefined") return false;
  window.createLemonSqueezy?.();
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(url);
    return true;
  }
  return false;
}

function SecurityPanel({
  locale,
  billing,
}: {
  locale: PreviewLocale;
  billing: BillingCycle;
}) {
  const copy = getCopy(locale, billing);
  const methods = locale === "tr"
    ? ["Visa", "Mastercard", "Apple Pay", "Google Pay", "PayPal"]
    : ["Visa", "Mastercard", "Apple Pay", "Google Pay", "PayPal"];

  return (
    <div className="flex h-full flex-col justify-between rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:p-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <LockKeyhole className="h-4 w-4" />
          {copy.secureTitle}
        </div>

        <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_40%),linear-gradient(135deg,#0f172a,#111827)] p-5 text-white shadow-2xl shadow-slate-300/30 dark:border-white/10 dark:shadow-black/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200">
                {copy.managedBy}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight">
                {copy.sessionNotice}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6 text-violet-200" />
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-200">
            {copy.secureText}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {methods.map((label) => methodPill(label))}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-300">
            {copy.methodHint}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {copy.securityItems.map((item, index) => {
            const icon = index === 0 ? CreditCard : index === 1 ? BadgeCheck : Sparkles;
            const Icon = icon;
            return (
              <div
                key={item}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-black leading-6 text-slate-900 dark:text-white">
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{copy.journeyTitle}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.text}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {copy.steps.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  locale,
  billing,
  selectedPlanKey,
  planName,
  planDescription,
  unitPrice,
  total,
  formatPrice,
  bullets,
}: {
  locale: PreviewLocale;
  billing: BillingCycle;
  selectedPlanKey: string;
  planName: string;
  planDescription: string;
  unitPrice: number;
  total: number;
  formatPrice: (amount: number) => string;
  bullets: string[];
}) {
  const router = useRouter();
  const { status } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [lemonReady, setLemonReady] = useState(false);
  const [lemonFailed, setLemonFailed] = useState(false);
  const copy = getCopy(locale, billing);
  const checkoutPlanKey = useMemo(
    () => buildCheckoutPlanKey(selectedPlanKey, billing),
    [billing, selectedPlanKey],
  );

  const goToLogin = () => {
    toast.info(copy.loginNeeded, locale === "tr" ? "Giris gerekli" : "Login required");
    router.push(buildLoginHref(selectedPlanKey, billing));
  };

  const handleCheckout = async () => {
    if (loading) return;
    if (!checkoutPlanKey) {
      toast.error(copy.invalidPlan, locale === "tr" ? "Paket secimi" : "Plan selection");
      return;
    }
    if (status === "unauthenticated") {
      goToLogin();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ plan: checkoutPlanKey }),
      });

      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        goToLogin();
        return;
      }
      if (!response.ok || typeof body?.url !== "string") {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : (locale === "tr"
              ? "Checkout olusturulamadi."
              : "Checkout could not be created."),
        );
      }

      const opened = openLemonOverlay(body.url);
      if (!opened) {
        window.location.assign(body.url);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : (locale === "tr" ? "Aga baglantisinda bir sorun olustu." : "A network error occurred."),
        locale === "tr" ? "Odeme hatasi" : "Payment error",
      );
    } finally {
      setLoading(false);
    }
  };

  const statusPalette = status === "authenticated"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
    : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";

  return (
    <>
      <Script
        id="lemon-squeezy-js"
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
        onReady={() => {
          if (typeof window === "undefined") return;
          window.createLemonSqueezy?.();
          setLemonReady(Boolean(window.LemonSqueezy?.Url?.Open));
          setLemonFailed(false);
        }}
        onError={() => {
          setLemonReady(false);
          setLemonFailed(true);
        }}
      />

      <div className="flex h-full w-full flex-col rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:p-8">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.summary}</h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">
          {planDescription}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
            {planName}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {billing === "yearly"
              ? (locale === "tr" ? "Yillik faturalama" : "Yearly billing")
              : (locale === "tr" ? "Aylik faturalama" : "Monthly billing")}
          </span>
          <span className={cn("rounded-full px-3 py-1.5", statusPalette)}>
            {status === "authenticated"
              ? (locale === "tr" ? "Giris dogrulandi" : "Session verified")
              : (locale === "tr" ? "Giris gerekli" : "Login required")}
          </span>
        </div>

        <div className="mt-8 flex-1 space-y-3">
          {bullets.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                <Check className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{copy.included}</p>
                <p className="mt-0.5 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{item}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4 border-t border-slate-100 pt-6 dark:border-white/10">
          <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>{copy.subtotal}</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>{copy.tax}</span>
            <span className="text-right text-slate-900 dark:text-white">{copy.taxHint}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>{locale === "tr" ? "Paket bedeli" : "Plan price"}</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(unitPrice)}</span>
          </div>
          <div className="flex justify-between pt-2 text-lg font-black text-slate-900 dark:text-white">
            <span>{copy.total}</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
            {copy.totalHint}
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            aria-busy={loading}
            className={cn(
              "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black transition-all",
              loading
                ? "cursor-wait bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                : "bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 hover:shadow-xl hover:shadow-violet-600/40",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {copy.loading}
              </>
            ) : (
              <>
                {copy.button}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-violet-500" />
            <span>
              {lemonReady && !lemonFailed ? copy.managedBy : copy.loadFallback}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function PricingPaymentPreview({
  locale,
  billing,
  selectedPlanKey,
  planName,
  planDescription,
  unitPrice,
  formatPrice,
  bullets = [],
}: PricingPaymentPreviewProps) {
  const total = billing === "yearly" ? unitPrice * 12 : unitPrice;
  const copy = getCopy(locale, billing);
  const includedBullets = bullets.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
          <QrCode size={16} />
          {copy.badge}
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h2>
        <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">{copy.text}</p>
      </div>

      <div className="grid gap-8 rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <SecurityPanel locale={locale} billing={billing} />
        <div className="flex items-center">
          <OrderSummary
            locale={locale}
            billing={billing}
            selectedPlanKey={selectedPlanKey}
            planName={planName}
            planDescription={planDescription}
            unitPrice={unitPrice}
            total={total}
            formatPrice={formatPrice}
            bullets={includedBullets}
          />
        </div>
      </div>
    </section>
  );
}

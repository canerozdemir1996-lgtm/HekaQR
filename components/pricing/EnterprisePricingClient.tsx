"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  Loader2,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { enterpriseQuoteFormSchema, type EnterpriseQuoteFormValues } from "@/lib/enterprise/quote-schema";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  buildEnterpriseSearchParams,
  buildEnterpriseSummaryLines,
  calculateEnterprisePricing,
  enterprisePricingCopy,
  enterpriseTrustItems,
  ENTERPRISE_STORAGE_KEY,
  formatEnterpriseCurrency,
  formatEnterpriseNumber,
  getEnterpriseDefaultConfiguration,
  getEnterpriseSliderDefinitions,
  normalizeEnterpriseBillingPreference,
  parseEnterpriseConfigurationFromSearch,
  type EnterpriseBillingPreference,
  type EnterpriseConfiguration,
  type EnterpriseLocale,
} from "@/lib/pricing/enterprise-pricing";

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

const BILLING_TABS: Array<{
  key: EnterpriseBillingPreference;
  labels: Record<EnterpriseLocale, string>;
}> = [
  {
    key: "monthly",
    labels: { tr: "Aylik", en: "Monthly" },
  },
  {
    key: "yearly",
    labels: { tr: "Yıllık — %20 avantaj", en: "Yearly - 20% advantage" },
  },
];

const TRUST_ICONS = [Users, Zap, Globe2, ShieldCheck];

function detectLocale(browserLocale?: string | null): EnterpriseLocale {
  return browserLocale?.toLowerCase().startsWith("tr") ? "tr" : "en";
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

function usePricingLocale() {
  const [locale, setLocale] = useState<EnterpriseLocale>(() => {
    if (typeof window === "undefined") return "tr";
    const stored = window.localStorage.getItem("pricing-locale") as EnterpriseLocale | null;
    return stored === "tr" || stored === "en" ? stored : detectLocale(window.navigator.language);
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const update = (next: EnterpriseLocale) => {
    setLocale(next);
    window.localStorage.setItem("pricing-locale", next);
    document.documentElement.lang = next;
  };

  return { locale, update };
}

export default function EnterprisePricingClient() {
  const sliders = useMemo(() => getEnterpriseSliderDefinitions(), []);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [theme, toggleTheme] = useTheme();
  const { locale, update } = usePricingLocale();
  const [configuration, setConfiguration] = useState<EnterpriseConfiguration>(() => getEnterpriseDefaultConfiguration());
  const [billingPreference, setBillingPreference] = useState<EnterpriseBillingPreference>("yearly");
  const [screenMessage, setScreenMessage] = useState("");
  const [screenTone, setScreenTone] = useState<"success" | "error">("success");
  const [lemonReady, setLemonReady] = useState(false);
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const honeypotValueRef = useRef("");

  const form = useForm<EnterpriseQuoteFormValues>({
    resolver: zodResolver(enterpriseQuoteFormSchema),
    defaultValues: {
      fullName: "",
      company: "",
      email: "",
      phone: "",
      note: "",
    },
  });

  useEffect(() => {
    if (hydratedRef.current) return;

    const hasQueryState = sliders.some((slider) => searchParams.get(slider.key) !== null) || searchParams.get("billing") !== null;
    const queryConfiguration = parseEnterpriseConfigurationFromSearch(searchParams);
    const queryBilling = normalizeEnterpriseBillingPreference(searchParams.get("billing"));

    let storedConfiguration = getEnterpriseDefaultConfiguration();
    let storedBilling: EnterpriseBillingPreference = "yearly";

    try {
      const raw = window.localStorage.getItem(ENTERPRISE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          configuration?: EnterpriseConfiguration;
          billingPreference?: EnterpriseBillingPreference;
        };
        if (parsed.configuration) {
          storedConfiguration = parsed.configuration;
        }
        if (parsed.billingPreference) {
          storedBilling = normalizeEnterpriseBillingPreference(parsed.billingPreference);
        }
      }
    } catch {
      // Ignore malformed local state and fall back to defaults.
    }

    setConfiguration(hasQueryState ? queryConfiguration : storedConfiguration);
    setBillingPreference(hasQueryState ? queryBilling : storedBilling);
    hydratedRef.current = true;
  }, [searchParams, sliders]);

  useEffect(() => {
    if (!hydratedRef.current || syncingRef.current) return;

    const params = buildEnterpriseSearchParams(configuration, billingPreference);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      syncingRef.current = true;
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      queueMicrotask(() => {
        syncingRef.current = false;
      });
    }

    window.localStorage.setItem(
      ENTERPRISE_STORAGE_KEY,
      JSON.stringify({ configuration, billingPreference }),
    );
  }, [billingPreference, configuration, pathname, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("quote") === "success") {
      setScreenMessage(enterprisePricingCopy.quoteSuccess[locale]);
      setScreenTone("success");
    }
  }, [locale, searchParams]);

  const pricing = useMemo(
    () => calculateEnterprisePricing(configuration),
    [configuration],
  );
  const summaryLines = useMemo(
    () => buildEnterpriseSummaryLines(configuration, locale),
    [configuration, locale],
  );

  const activePrice =
    billingPreference === "yearly"
      ? formatEnterpriseCurrency(pricing.annualCents, locale)
      : formatEnterpriseCurrency(pricing.monthlyCents, locale);

  const handleSliderChange = (key: keyof EnterpriseConfiguration, value: number) => {
    setConfiguration((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (form.formState.isSubmitting) return;

    setScreenMessage("");
    setScreenTone("success");

    try {
      const response = await fetch("/api/enterprise/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          contact: values,
          configuration,
          billingPreference,
          website: honeypotValueRef.current,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : enterprisePricingCopy.quoteError[locale],
        );
      }

      setScreenMessage(enterprisePricingCopy.quoteSuccess[locale]);
      setScreenTone("success");
      toast.success(enterprisePricingCopy.quoteSuccess[locale], values.company);

      if (typeof body.checkoutUrl === "string" && body.checkoutUrl.length > 0) {
        const opened = openLemonOverlay(body.checkoutUrl);
        if (!opened) {
          window.location.assign(body.checkoutUrl);
        } else {
          toast.info(
            locale === "tr" ? "Guvenli odeme ekrani aciliyor." : "Secure checkout is opening.",
            locale === "tr" ? "Checkout" : "Checkout",
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : enterprisePricingCopy.quoteError[locale];
      setScreenMessage(message);
      setScreenTone("error");
      toast.error(message, locale === "tr" ? "Teklif" : "Quote");
    }
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fc] text-slate-950 dark:bg-[#050713] dark:text-white">
      <Script
        id="lemon-squeezy-enterprise"
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
        onReady={() => {
          if (typeof window === "undefined") return;
          window.createLemonSqueezy?.();
          setLemonReady(Boolean(window.LemonSqueezy?.Url?.Open));
        }}
        onError={() => setLemonReady(false)}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(15,23,42,0.08),transparent_24%),radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.08),transparent_26%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[90rem] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        >
          <ArrowLeft size={16} />
          {enterprisePricingCopy.backToPricing[locale]}
        </Link>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white/85 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
            {(["tr", "en"] as EnterpriseLocale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => update(item)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-black transition-colors",
                  locale === item
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-8">
        <section className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
              <Sparkles size={16} />
              {enterprisePricingCopy.badge[locale]}
            </div>

            <h1 className="mt-6 max-w-4xl whitespace-pre-line text-[clamp(2.3rem,4.4vw,4.8rem)] font-black leading-[0.98] tracking-tight">
              {enterprisePricingCopy.title[locale]}
            </h1>

            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              {enterprisePricingCopy.description[locale]}
            </p>

            <div className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-slate-200 bg-white/90 p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
              {BILLING_TABS.map((item) => {
                const active = billingPreference === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBillingPreference(item.key)}
                    className={cn(
                      "rounded-[1.2rem] px-4 py-3 text-sm font-black transition-all",
                      active
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                    )}
                  >
                    {item.labels[locale]}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-4">
              {sliders.map((slider) => {
                const selected = configuration[slider.key];
                const badgeValue =
                  slider.key === "monthlyScans"
                    ? `${formatEnterpriseNumber(selected, locale)} ${slider.badgeUnit[locale]}`
                    : `${formatEnterpriseNumber(selected, locale)} ${slider.badgeUnit[locale]}`;

                return (
                  <section
                    key={slider.key}
                    className="rounded-[2rem] border border-slate-200 bg-white/92 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-lg font-black tracking-tight">{slider.label[locale]}</h2>
                        <p className="mt-1 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">
                          {slider.description[locale]}
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                        {badgeValue}
                      </div>
                    </div>

                    <div className="mt-5">
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={selected}
                        aria-label={slider.label[locale]}
                        onChange={(event) => handleSliderChange(slider.key, Number(event.target.value))}
                        className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600 dark:bg-white/10"
                      />
                      <div className="mt-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        <span>{formatEnterpriseNumber(slider.min, locale)}</span>
                        <span>{formatEnterpriseNumber(slider.max, locale)}</span>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 space-y-5 lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.32),transparent_30%),linear-gradient(180deg,#0f172a,#020617)] p-6 text-white shadow-[0_30px_80px_-36px_rgba(2,6,23,0.75)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200">
                    {enterprisePricingCopy.summaryTitle[locale]}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-300">
                    {billingPreference === "yearly"
                      ? enterprisePricingCopy.yearlyAdvantage[locale]
                      : enterprisePricingCopy.billingLabel[locale]}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-violet-100">
                  {activePrice}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-[1.5rem] border p-4 transition-colors",
                    billingPreference === "monthly"
                      ? "border-violet-300/30 bg-white/12"
                      : "border-white/10 bg-white/6",
                  )}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    {enterprisePricingCopy.monthlyTitle[locale]}
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {formatEnterpriseCurrency(pricing.monthlyCents, locale)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-[1.5rem] border p-4 transition-colors",
                    billingPreference === "yearly"
                      ? "border-violet-300/30 bg-white/12"
                      : "border-white/10 bg-white/6",
                  )}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    {enterprisePricingCopy.yearlyTitle[locale]}
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {formatEnterpriseCurrency(pricing.annualCents, locale)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/7 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                  {enterprisePricingCopy.includedTitle[locale]}
                </p>
                <div className="mt-4 space-y-2.5">
                  {summaryLines.map((line) => (
                    <div
                      key={line.key}
                      className="flex items-start justify-between gap-4 rounded-2xl bg-white/6 px-3 py-2.5 text-sm font-semibold"
                    >
                      <span className="min-w-0 text-slate-200">{line.label}</span>
                      <span className="text-right font-black text-white">{line.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-violet-300/10 bg-white/7 px-4 py-3 text-sm font-semibold leading-7 text-slate-200">
                {enterprisePricingCopy.disclaimer[locale]}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-white/[0.04]">
              <h2 className="text-2xl font-black tracking-tight">
                {enterprisePricingCopy.quoteTitle[locale]}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                {enterprisePricingCopy.quoteDescription[locale]}
              </p>

              <form onSubmit={onSubmit} className="mt-5 space-y-4" aria-busy={form.formState.isSubmitting}>
                <div className="sr-only" aria-live="polite">
                  {screenMessage}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {enterprisePricingCopy.formFields.fullName[locale]}
                    </span>
                    <input
                      type="text"
                      autoComplete="name"
                      {...form.register("fullName")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm font-semibold text-rose-600">{form.formState.errors.fullName.message}</p>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {enterprisePricingCopy.formFields.company[locale]}
                    </span>
                    <input
                      type="text"
                      autoComplete="organization"
                      {...form.register("company")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                    {form.formState.errors.company && (
                      <p className="text-sm font-semibold text-rose-600">{form.formState.errors.company.message}</p>
                    )}
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {enterprisePricingCopy.formFields.email[locale]}
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      {...form.register("email")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm font-semibold text-rose-600">{form.formState.errors.email.message}</p>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {enterprisePricingCopy.formFields.phone[locale]}
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      {...form.register("phone")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm font-semibold text-rose-600">{form.formState.errors.phone.message}</p>
                    )}
                  </label>
                </div>

                <label className="hidden" aria-hidden="true">
                  <span>Website</span>
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    name="website"
                    onChange={(event) => {
                      honeypotValueRef.current = event.target.value;
                    }}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {enterprisePricingCopy.formFields.note[locale]}
                  </span>
                  <textarea
                    rows={4}
                    {...form.register("note")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                  {form.formState.errors.note && (
                    <p className="text-sm font-semibold text-rose-600">{form.formState.errors.note.message}</p>
                  )}
                </label>

                {screenMessage && (
                  <div
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm font-semibold",
                      screenTone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
                    )}
                  >
                    {screenMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  aria-busy={form.formState.isSubmitting}
                  className={cn(
                    "inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all",
                    form.formState.isSubmitting
                      ? "cursor-wait bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      : "bg-violet-600 text-white shadow-lg shadow-violet-600/25 hover:-translate-y-0.5 hover:bg-violet-500",
                  )}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {enterprisePricingCopy.quoteSubmitting[locale]}
                    </>
                  ) : (
                    <>
                      {enterprisePricingCopy.quoteButton[locale]}
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-violet-500" />
                  <span>
                    {lemonReady
                      ? locale === "tr"
                        ? "Kurumsal self-serve aktifse guvenli checkout ayni akista acilir."
                        : "If self-serve enterprise checkout is enabled, secure checkout opens in the same flow."
                      : locale === "tr"
                        ? "Checkout overlay hazir degilse hosted sayfaya guvenli yonlendirme yapilir."
                        : "If the checkout overlay is unavailable, the flow safely falls back to the hosted page."}
                  </span>
                </div>
              </form>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                {enterprisePricingCopy.trustTitle[locale]}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {enterpriseTrustItems.map((item, index) => {
                  const Icon = TRUST_ICONS[index] ?? Building2;
                  return (
                    <article
                      key={item.title.en}
                      className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-black">{item.title[locale]}</h3>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                        {item.text[locale]}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

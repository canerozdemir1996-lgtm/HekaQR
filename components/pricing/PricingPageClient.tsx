"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Check,
  ChevronDown,
  Globe2,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { useSession } from "@/hooks/useSupabaseSession";
import { useTheme } from "@/lib/theme";
import { PricingPaymentPreview } from "@/components/ui/payment-preview";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLE_KEY,
  PRICING_LOCALE_KEY,
  comparisonRows,
  computeYearlyDiscountPercent,
  currencyByLocale,
  faqItems,
  getPlanCheckoutHref,
  formatCurrency,
  getPlanPrice,
  localeLabels,
  pricingPageCopy,
  pricingPlans,
  trustItems,
  type BillingCycle,
  type PricingLocale,
} from "@/lib/pricing";

function usePricingPreferences() {
  const [locale, setLocale] = useState<PricingLocale>(() => {
    if (typeof window === "undefined") return "tr";
    const storedLocale = window.localStorage.getItem(PRICING_LOCALE_KEY) as PricingLocale | null;
    // Ürün Türkçe öncelikli — kullanıcı localStorage'da açıkça "en" seçmediyse
    // varsayılan her zaman "tr" (tarayıcı dili otomatik sıçramaya neden olmasın).
    return storedLocale === "tr" || storedLocale === "en" ? storedLocale : "tr";
  });
  const [billing, setBilling] = useState<BillingCycle>(() => {
    if (typeof window === "undefined") return "yearly";
    const storedBilling = window.localStorage.getItem(BILLING_CYCLE_KEY) as BillingCycle | null;
    return storedBilling === "monthly" || storedBilling === "yearly" ? storedBilling : "yearly";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(PRICING_LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(BILLING_CYCLE_KEY, billing);
  }, [billing]);

  const updateLocale = (next: PricingLocale) => {
    setLocale(next);
  };

  const updateBilling = (next: BillingCycle) => {
    setBilling(next);
  };

  return { locale, billing, updateLocale, updateBilling };
}

function PricingHeader({
  locale,
  setLocale,
  theme,
  toggleTheme,
  authenticated,
}: {
  locale: PricingLocale;
  setLocale: (locale: PricingLocale) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  authenticated: boolean;
}) {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <ArrowLeft size={16} />
          {pricingPageCopy.navBack[locale]}
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          {(["tr", "en"] as PricingLocale[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLocale(item)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-black transition-colors",
                locale === item
                  ? "bg-violet-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
              )}
            >
              {localeLabels[item][locale]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          aria-label="Theme toggle"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          href={authenticated ? "/dashboard" : "/login"}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
        >
          {authenticated
            ? (locale === "tr" ? "Panele Git" : "Go to Dashboard")
            : pricingPageCopy.login[locale]}
        </Link>
      </div>
    </header>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-sm font-black sm:text-base">{question}</span>
        <ChevronDown size={18} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <p className="mt-4 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{answer}</p> : null}
    </div>
  );
}

export default function PricingPageClient() {
  const [theme, toggleTheme] = useTheme();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && !!session?.user;
  const { locale, billing, updateBilling, updateLocale } = usePricingPreferences();
  const currency = currencyByLocale[locale];

  const priceCards = useMemo(
    () =>
      pricingPlans.map((plan) => ({
        ...plan,
        formattedPrice: plan.custom ? pricingPageCopy.customLabel[locale] : formatCurrency(locale, getPlanPrice(plan, locale, billing) ?? 0),
        yearlyDiscountPercent: computeYearlyDiscountPercent(plan, locale),
      })),
    [billing, locale],
  );
  const featuredPlan = priceCards.find((plan) => plan.key === "pro") ?? priceCards[1];
  const featuredPlanAmount = featuredPlan.custom ? 0 : getPlanPrice(featuredPlan, locale, billing) ?? 0;

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.14),transparent_28%)]" />
      <PricingHeader locale={locale} setLocale={updateLocale} theme={theme} toggleTheme={toggleTheme} authenticated={authenticated} />

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 text-center sm:px-6 md:pt-16">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
            <Sparkles size={16} />
            {pricingPageCopy.heroBadge[locale]}
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.03] tracking-tight sm:text-6xl">
            {pricingPageCopy.heroTitle[locale]}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
            {pricingPageCopy.heroText[locale]}
          </p>

          <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-[1.5rem] border border-slate-200 bg-white/85 p-2 shadow-lg shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
            {(["monthly", "yearly"] as BillingCycle[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateBilling(item)}
                className={cn(
                  "rounded-[1rem] px-5 py-3 text-sm font-black transition-all",
                  billing === item
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {item === "monthly" ? pricingPageCopy.monthly[locale] : pricingPageCopy.yearly[locale]}
              </button>
            ))}
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              {pricingPageCopy.yearlyHint[locale]}
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
          <div className="grid gap-5 lg:grid-cols-4">
            {priceCards.map((plan) => (
              <article
                key={plan.key}
                className={cn(
                  "relative rounded-[2rem] border p-6 shadow-xl transition hover:-translate-y-1 dark:shadow-black/20",
                  plan.highlighted
                    ? "border-violet-300 bg-slate-950 text-white shadow-violet-400/10 dark:border-violet-400/30"
                    : "border-slate-200 bg-white/85 dark:border-white/10 dark:bg-white/[0.04]",
                )}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]", plan.highlighted ? "bg-white/10 text-violet-200" : "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200")}>
                    {plan.badge[locale]}
                  </span>
                  {plan.highlighted ? <BadgeCheck className="text-emerald-300" size={18} /> : null}
                </div>
                <h2 className="text-2xl font-black">{plan.name[locale]}</h2>
                <p className={cn("mt-3 text-sm font-semibold leading-7", plan.highlighted ? "text-slate-200" : "text-slate-600 dark:text-slate-300")}>
                  {plan.description[locale]}
                </p>
                <div className="mt-6 flex items-end gap-2">
                  <div className="text-4xl font-black">
                    {plan.formattedPrice}
                  </div>
                  {!plan.custom ? (
                    <div className={cn("pb-1 text-sm font-black uppercase tracking-[0.16em]", plan.highlighted ? "text-violet-200" : "text-slate-500 dark:text-slate-400")}>
                      {pricingPageCopy.monthSuffix[locale]}
                    </div>
                  ) : null}
                </div>
                {billing === "yearly" && plan.yearlyDiscountPercent ? (
                  <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    %{plan.yearlyDiscountPercent} {locale === "tr" ? "daha avantajlı" : "cheaper"}
                  </span>
                ) : null}
                <p className={cn("mt-3 min-h-[48px] text-sm font-semibold leading-6", plan.highlighted ? "text-slate-300" : "text-slate-500 dark:text-slate-400")}>
                  {plan.caption[locale]}
                </p>
                <Link
                  href={getPlanCheckoutHref(plan.key, billing)}
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5",
                    plan.highlighted
                      ? "bg-white text-slate-950 hover:bg-violet-100"
                      : "bg-violet-600 text-white hover:bg-violet-700",
                  )}
                >
                  {plan.ctaLabel[locale]}
                  <ArrowRight size={16} />
                </Link>
                <div className="mt-6 space-y-3">
                  {plan.bullets.map((bullet) => (
                    <div key={bullet.tr} className="flex items-start gap-3">
                      <Check size={16} className={cn("mt-0.5 shrink-0", plan.highlighted ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-300")} />
                      <span className={cn("text-sm font-semibold leading-6", plan.highlighted ? "text-slate-100" : "text-slate-600 dark:text-slate-300")}>{bullet[locale]}</span>
                    </div>
                  ))}
                </div>
                {!plan.custom && plan.key !== "free" ? (
                  <div className={cn("mt-6 border-t pt-5 text-xs font-black uppercase tracking-[0.18em]", plan.highlighted ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400")}>
                    {currency === "TRY" ? "TL" : "USD"} · {billing === "monthly" ? pricingPageCopy.monthly[locale] : pricingPageCopy.yearly[locale]}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <PricingPaymentPreview
          locale={locale}
          billing={billing}
          selectedPlanKey={featuredPlan.key}
          planName={featuredPlan.name[locale]}
          planDescription={featuredPlan.description[locale]}
          unitPrice={featuredPlanAmount}
          formatPrice={(amount) => formatCurrency(locale, amount)}
          bullets={featuredPlan.bullets.map((item) => item[locale])}
        />

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{pricingPageCopy.compareTitle[locale]}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{pricingPageCopy.trustTitle[locale]}</h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {pricingPageCopy.compareText[locale]}
            </p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] border-b border-slate-200 bg-slate-100/90 px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 sm:px-6">
              <div>{pricingPageCopy.included[locale]}</div>
              {pricingPlans.map((plan) => (
                <div key={plan.key} className={cn("px-2 text-center", plan.key === "pro" && "text-violet-600 dark:text-violet-300")}>
                  {plan.name[locale]}
                </div>
              ))}
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {comparisonRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] px-4 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:px-6">
                  <div className="pr-4 font-black text-slate-900 dark:text-white">{row.label[locale]}</div>
                  {pricingPlans.map((plan) => (
                    <div key={plan.key} className={cn("px-2 text-center", plan.key === "pro" && "font-black text-violet-700 dark:text-violet-200")}>
                      {row.values[plan.key][locale]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">{pricingPageCopy.trustTitle[locale]}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{pricingPageCopy.trustTitle[locale]}</h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {pricingPageCopy.trustText[locale]}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: ShieldCheck, item: 0 },
              { icon: Globe2, item: 1 },
              { icon: CalendarRange, item: 2 },
              { icon: Lock, item: 3 },
            ].map(({ icon: Icon, item }) => (
              <div key={item} className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-black">{trustItems[item].title[locale]}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{trustItems[item].text[locale]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-12 text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{pricingPageCopy.faqTitle[locale]}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{pricingPageCopy.faqTitle[locale]}</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {pricingPageCopy.faqText[locale]}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <FaqCard key={item.question.tr} question={item.question[locale]} answer={item.answer[locale]} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24">
          <div className="rounded-[2.5rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-300/30 dark:border-white/10 dark:shadow-black/30 md:p-14">
            <Zap className="mx-auto mb-5 text-violet-300" size={32} />
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{pricingPageCopy.bottomTitle[locale]}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              {pricingPageCopy.bottomText[locale]}
            </p>
            <Link href="/pricing/enterprise" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-violet-100">
              {pricingPageCopy.bottomCta[locale]} <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CreditCard, Moon, ShieldCheck, Sun } from "lucide-react";
import { PricingPaymentPreview } from "@/components/ui/payment-preview";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLE_KEY,
  PRICING_LOCALE_KEY,
  detectLocaleFromBrowser,
  findPricingPlan,
  formatCurrency,
  getPlanPrice,
  localeLabels,
  normalizeBillingCycle,
  normalizePricingPlanKey,
  pricingPageCopy,
  type BillingCycle,
  type PlanKey,
  type PricingLocale,
} from "@/lib/pricing";

export default function PricingCheckoutClient({
  initialPlan,
  initialBilling,
}: {
  initialPlan?: string;
  initialBilling?: string;
}) {
  const [theme, toggleTheme] = useTheme();
  const [locale, setLocale] = useState<PricingLocale>("tr");

  const planKey = normalizePricingPlanKey(initialPlan);
  const billing = normalizeBillingCycle(initialBilling);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(PRICING_LOCALE_KEY) as PricingLocale | null;
    const nextLocale = storedLocale === "tr" || storedLocale === "en"
      ? storedLocale
      : detectLocaleFromBrowser(window.navigator.language);
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(BILLING_CYCLE_KEY, billing);
  }, [billing]);

  const updateLocale = (next: PricingLocale) => {
    setLocale(next);
    window.localStorage.setItem(PRICING_LOCALE_KEY, next);
    document.documentElement.lang = next;
  };

  const plan = useMemo(() => findPricingPlan(planKey), [planKey]);
  const amount = plan.custom ? 0 : getPlanPrice(plan, locale, billing) ?? 0;
  const isYearly = billing === "yearly";

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.14),transparent_28%)]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/pricing" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <ArrowLeft size={16} />
          {pricingPageCopy.navPricing[locale]}
        </Link>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
            {(["tr", "en"] as PricingLocale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateLocale(item)}
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
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-2 pt-10 sm:px-6 md:pt-14">
          <div className="grid gap-6 rounded-[2.5rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
                {locale === "tr" ? "Secili Paket" : "Selected plan"}
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                {plan.name[locale]} {locale === "tr" ? "odemesi" : "checkout"}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
                {plan.description[locale]}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-black">
                <span className="rounded-2xl bg-violet-100 px-4 py-2 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  {isYearly ? pricingPageCopy.yearly[locale] : pricingPageCopy.monthly[locale]}
                </span>
                <span className="rounded-2xl bg-slate-100 px-4 py-2 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {formatCurrency(locale, isYearly ? amount * 12 : amount)}
                </span>
                {isYearly ? (
                  <span className="rounded-2xl bg-emerald-100 px-4 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {pricingPageCopy.yearSavings[locale]}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {plan.bullets.slice(0, 3).map((bullet) => (
                <div key={bullet.tr} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                    <Check size={18} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{bullet[locale]}</p>
                </div>
              ))}
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {locale === "tr" ? "Guvenli odeme ve panel ici aktivasyon akisi" : "Secure checkout and in-product activation flow"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                  <CreditCard size={18} />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {locale === "tr" ? "Plan seciminden sonra dogrudan odemeye geldiniz" : "You were redirected straight to checkout after plan selection"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <PricingPaymentPreview
          locale={locale}
          billing={billing}
          planName={plan.name[locale]}
          planDescription={plan.description[locale]}
          unitPrice={amount}
          formatPrice={(value) => formatCurrency(locale, value)}
        />
      </main>
    </div>
  );
}

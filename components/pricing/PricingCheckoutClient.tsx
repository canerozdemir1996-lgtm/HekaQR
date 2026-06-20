"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Moon, ShieldCheck, Sun } from "lucide-react";
import { PricingPaymentPreview } from "@/components/ui/payment-preview";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLE_KEY,
  PRICING_LOCALE_KEY,
  computeYearlyDiscountPercent,
  findPricingPlan,
  formatCurrency,
  getPlanPrice,
  localeLabels,
  normalizeBillingCycle,
  normalizePricingPlanKey,
  pricingPageCopy,
  pricingPlans,
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
  const router = useRouter();
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();
  const [locale, setLocale] = useState<PricingLocale>(() => {
    if (typeof window === "undefined") return "tr";
    const storedLocale = window.localStorage.getItem(PRICING_LOCALE_KEY) as PricingLocale | null;
    // Ürün Türkçe öncelikli — tarayıcı dili otomatik sıçramaya neden olmasın.
    return storedLocale === "tr" || storedLocale === "en" ? storedLocale : "tr";
  });
  const paidPlans = useMemo(
    () => pricingPlans.filter((plan) => !plan.custom && plan.key !== "free"),
    [],
  );
  const defaultPlanKey = useMemo<PlanKey>(() => {
    const normalized = normalizePricingPlanKey(initialPlan);
    return paidPlans.some((plan) => plan.key === normalized) ? normalized : "pro";
  }, [initialPlan, paidPlans]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>(defaultPlanKey);
  const [billing, setBilling] = useState<BillingCycle>(() => {
    if (typeof window === "undefined") return normalizeBillingCycle(initialBilling);
    const storedBilling = window.localStorage.getItem(BILLING_CYCLE_KEY) as BillingCycle | null;
    return storedBilling === "monthly" || storedBilling === "yearly"
      ? storedBilling
      : normalizeBillingCycle(initialBilling);
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(PRICING_LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(BILLING_CYCLE_KEY, billing);
  }, [billing]);

  useEffect(() => {
    setSelectedPlanKey(defaultPlanKey);
  }, [defaultPlanKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("plan", selectedPlanKey);
    params.set("billing", billing);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [billing, pathname, router, selectedPlanKey]);

  const updateLocale = (next: PricingLocale) => {
    setLocale(next);
  };

  const plan = useMemo(() => findPricingPlan(selectedPlanKey), [selectedPlanKey]);
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
                {locale === "tr" ? "Seçili Paket" : "Selected plan"}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                {(["monthly", "yearly"] as BillingCycle[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setBilling(item)}
                    className={cn(
                      "rounded-[0.9rem] px-4 py-2 text-xs font-black transition-all sm:px-5 sm:text-sm",
                      billing === item
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                    )}
                  >
                    {item === "monthly" ? pricingPageCopy.monthly[locale] : pricingPageCopy.yearly[locale]}
                  </button>
                ))}
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {pricingPageCopy.yearlyHint[locale]}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                {plan.name[locale]} {locale === "tr" ? "ödemesi" : "checkout"}
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
                {isYearly && computeYearlyDiscountPercent(plan, locale) ? (
                  <span className="rounded-2xl bg-emerald-100 px-4 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    %{computeYearlyDiscountPercent(plan, locale)} {locale === "tr" ? "daha avantajlı" : "cheaper"}
                  </span>
                ) : null}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {paidPlans.map((paidPlan) => {
                  const planAmount = getPlanPrice(paidPlan, locale, billing) ?? 0;
                  const isActive = paidPlan.key === selectedPlanKey;
                  return (
                    <button
                      key={paidPlan.key}
                      type="button"
                      onClick={() => setSelectedPlanKey(paidPlan.key)}
                      className={cn(
                        "rounded-[1.5rem] border p-4 text-left transition-all",
                        isActive
                          ? "border-violet-400 bg-violet-50 shadow-lg shadow-violet-200/40 dark:border-violet-400/40 dark:bg-violet-500/10"
                          : "border-slate-200 bg-white/70 hover:border-violet-200 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-black text-slate-900 dark:text-white">{paidPlan.name[locale]}</span>
                        {isActive ? (
                          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                            {locale === "tr" ? "Secili" : "Selected"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 min-h-[44px] text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                        {paidPlan.caption[locale]}
                      </p>
                      <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                        {formatCurrency(locale, billing === "yearly" ? planAmount * 12 : planAmount)}
                      </div>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                        {billing === "yearly"
                          ? (locale === "tr" ? "Yıllık toplam" : "Yearly total")
                          : (locale === "tr" ? "Aylık ödeme" : "Monthly payment")}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <Link
                  href="/pricing/enterprise"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                >
                  {locale === "tr" ? "Kurumsal ihtiyaç için teklif al" : "Need enterprise? Get a quote"}
                </Link>
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
                  {locale === "tr" ? "Güvenli ödeme ve panel içi aktivasyon akışı" : "Secure checkout and in-product activation flow"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                  <CreditCard size={18} />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {locale === "tr" ? "Plan seçiminden sonra doğrudan ödemeye geldiniz" : "You were redirected straight to checkout after plan selection"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <PricingPaymentPreview
          locale={locale}
          billing={billing}
          selectedPlanKey={selectedPlanKey}
          planName={plan.name[locale]}
          planDescription={plan.description[locale]}
          unitPrice={amount}
          formatPrice={(value) => formatCurrency(locale, value)}
          bullets={plan.bullets.map((item) => item[locale])}
        />
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Globe2,
  Mail,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  PRICING_LOCALE_KEY,
  buildEnterpriseMailto,
  buildEnterpriseSummaryLines,
  calculateEnterpriseEstimate,
  detectLocaleFromBrowser,
  enterpriseCopy,
  enterpriseSliders,
  enterpriseSummaries,
  formatCurrency,
  getEnterpriseDefaultInput,
  localeLabels,
  type EnterpriseQuoteInput,
  type PricingLocale,
} from "@/lib/pricing";

function usePricingLocale() {
  const [locale, setLocale] = useState<PricingLocale>("tr");

  useEffect(() => {
    const stored = window.localStorage.getItem(PRICING_LOCALE_KEY) as PricingLocale | null;
    const next = stored === "tr" || stored === "en" ? stored : detectLocaleFromBrowser(window.navigator.language);
    setLocale(next);
    document.documentElement.lang = next;
  }, []);

  const update = (next: PricingLocale) => {
    setLocale(next);
    window.localStorage.setItem(PRICING_LOCALE_KEY, next);
    document.documentElement.lang = next;
  };

  return { locale, update };
}

export default function EnterprisePricingClient() {
  const [theme, toggleTheme] = useTheme();
  const { locale, update } = usePricingLocale();
  const [input, setInput] = useState<EnterpriseQuoteInput>(getEnterpriseDefaultInput());
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    note: "",
  });

  const estimate = useMemo(() => calculateEnterpriseEstimate(input, locale), [input, locale]);
  const summary = useMemo(() => buildEnterpriseSummaryLines(input, locale), [input, locale]);
  const mailto = useMemo(
    () =>
      buildEnterpriseMailto({
        locale,
        input,
        monthly: estimate.monthly,
        yearlyMonthly: estimate.yearlyMonthly,
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        note: form.note,
      }),
    [estimate.monthly, estimate.yearlyMonthly, form.company, form.email, form.name, form.note, form.phone, input, locale],
  );

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.14),transparent_28%)]" />
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/pricing" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <ArrowLeft size={16} />
          {enterpriseCopy.backToPricing[locale]}
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
            {(["tr", "en"] as PricingLocale[]).map((item) => (
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
                {localeLabels[item][locale]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
              <Sparkles size={16} />
              {enterpriseCopy.badge[locale]}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.03] tracking-tight sm:text-6xl">
              {enterpriseCopy.title[locale]}
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {enterpriseCopy.text[locale]}
            </p>

            <div className="mt-8 space-y-4">
              {enterpriseSliders.map((slider) => (
                <div key={slider.key} className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-black">{slider.label[locale]}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{slider.description[locale]}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-900 dark:bg-white/10 dark:text-white">
                      {input[slider.key]} {slider.summaryUnit[locale]}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={input[slider.key]}
                    onChange={(event) =>
                      setInput((current) => ({ ...current, [slider.key]: Number(event.target.value) }))
                    }
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600 dark:bg-white/10"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    <span>{slider.min}</span>
                    <span>{slider.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/20 dark:border-white/10 dark:shadow-black/30">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-200">{enterpriseCopy.summaryTitle[locale]}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white/8 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{enterpriseCopy.monthlyLabel[locale]}</p>
                  <p className="mt-2 text-3xl font-black">{formatCurrency(locale, estimate.monthly)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white/8 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{enterpriseCopy.yearlyLabel[locale]}</p>
                  <p className="mt-2 text-3xl font-black">{formatCurrency(locale, estimate.yearlyTotal)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{enterpriseCopy.includedTitle[locale]}</p>
                <div className="mt-3 space-y-2">
                  {summary.map((line) => (
                    <div key={line.label} className="flex items-center justify-between gap-4 rounded-2xl bg-white/6 px-3 py-2 text-sm font-semibold">
                      <span className="text-slate-200">{line.label}</span>
                      <span className="font-black text-white">{line.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <h2 className="text-2xl font-black">{enterpriseCopy.formTitle[locale]}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{enterpriseCopy.formText[locale]}</p>
              <div className="mt-5 grid gap-3">
                {[
                  { key: "name", type: "text", label: locale === "tr" ? "Ad Soyad" : "Full Name" },
                  { key: "company", type: "text", label: locale === "tr" ? "Şirket" : "Company" },
                  { key: "email", type: "email", label: locale === "tr" ? "E-posta" : "Email" },
                  { key: "phone", type: "text", label: locale === "tr" ? "Telefon" : "Phone" },
                ].map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-200">{field.label}</span>
                    <input
                      type={field.type}
                      value={form[field.key as keyof typeof form]}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                ))}
                <label className="space-y-1.5">
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-200">{locale === "tr" ? "Not" : "Notes"}</span>
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                </label>
              </div>
              <a
                href={mailto}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                {enterpriseCopy.quoteButton[locale]}
                <Send size={16} />
              </a>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">{enterpriseCopy.trustTitle[locale]}</p>
              <div className="mt-5 space-y-4">
                {[ShieldCheck, Users, Globe2].map((Icon, index) => (
                  <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <Icon size={18} />
                    </div>
                    <p className="text-base font-black">{enterpriseSummaries[index].title[locale]}</p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{enterpriseSummaries[index].text[locale]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

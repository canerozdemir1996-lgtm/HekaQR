import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  FileCheck2,
  Gauge,
  Layers3,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";

const publicAppUrl = getPublicAppOrigin();

export const metadata: Metadata = {
  title: "QR Publish | Dynamic QR Code Platform",
  description:
    "Create dynamic QR codes with real-time analytics, A/B testing, digital business cards, and menu ordering. Edit the destination anytime without reprinting.",
  keywords: ["QR code generator", "dynamic QR code", "digital business card", "QR analytics", "menu QR code"],
  alternates: {
    canonical: `${publicAppUrl}/en`,
    languages: {
      "en-US": `${publicAppUrl}/en`,
      "tr-TR": publicAppUrl,
      "x-default": publicAppUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${publicAppUrl}/en`,
    title: "QR Publish | Dynamic QR Code Platform",
    description: "Create, brand, and track dynamic QR codes — edit the destination anytime without reprinting.",
    siteName: "QR Publish",
  },
};

const productModules = [
  "URL & campaign QR codes",
  "Menu QR & table ordering",
  "Digital business cards",
  "Wi-Fi, phone, email & text QR",
  "Folders & bulk QR generation",
  "QR design templates",
  "Scan analytics",
  "Webhooks, UTM, Pixel & GTM",
  "Device & date-based redirects",
];

const trustSignals = [
  {
    icon: <Users size={20} />,
    title: "Role-based access",
    text: "Assign owner, editor, and viewer roles to organization members — everyone only sees the QR codes they're allowed to.",
  },
  {
    icon: <Lock size={20} />,
    title: "Password-protected QR codes",
    text: "Protect sensitive destinations with a password; only visitors who enter it reach the target page.",
  },
  {
    icon: <Gauge size={20} />,
    title: "Brute-force protection",
    text: "Login attempts are rate-limited by IP and account to block automated password-guessing attacks.",
  },
  {
    icon: <BellRing size={20} />,
    title: "Webhook notifications",
    text: "Forward scan, order, feedback, and booking events to your own systems or tools like Zapier and Make.",
  },
  {
    icon: <FileCheck2 size={20} />,
    title: "GDPR-minded data handling",
    text: "Personal data is processed transparently, with retention policies and a public privacy policy.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Session security",
    text: "Authentication runs through NextAuth; passwords and session data are stored with industry-standard encryption.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create your content",
    desc: "Enter a URL, business card, restaurant menu, catalog, or campaign details from the dashboard.",
  },
  {
    step: "02",
    title: "Publish the QR design",
    desc: "Set colors, logo, template, slug, and dynamic redirect rules in one flow.",
  },
  {
    step: "03",
    title: "Measure and update",
    desc: "Track scans, orders, devices, and campaign performance from the reports panel — and change the destination anytime.",
  },
];

export default function EnglishLandingPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-950 dark:bg-[#000000] dark:text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/en" className="flex items-center">
          <BrandLogo className="w-[150px]" width={300} height={96} />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-bold">
          <Link href="/" className="text-slate-500 hover:text-violet-600 dark:text-slate-300">TR</Link>
          <Link href="/login" className="text-slate-700 hover:text-violet-600 dark:text-slate-200">Log in</Link>
          <Link href="/signup" className="rounded-full bg-violet-600 px-4 py-2 text-white hover:bg-violet-500">Start Free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Dynamic QR Code Platform</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          One QR code. <span className="text-violet-600 dark:text-violet-300">Any destination, anytime.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
          Print once, edit forever. Change the link, design, or content behind your QR code at any time — no reprinting, no broken codes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-lg hover:bg-violet-500">
            Start Free <ArrowRight size={16} />
          </Link>
          <Link href="/pricing?lang=en" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3.5 text-sm font-black hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            View pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Layers3 className="text-violet-600 dark:text-violet-300" />
            <h2 className="text-2xl font-black">What you can build</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productModules.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">
                <BadgeCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Security &amp; Compliance</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Real security measures, not marketing claims.</h2>
          <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
            We haven't completed independent certification audits yet, so here we only list security and compliance measures that are actually live in the platform today.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trustSignals.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{item.icon}</div>
              <h3 className="text-lg font-black">{item.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">How it works</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Go live in three steps</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <div key={item.step} className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-5 text-4xl font-black text-violet-600 dark:text-violet-300">{item.step}</div>
              <h3 className="text-xl font-black">{item.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24">
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-10 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <BarChart3 className="mx-auto text-violet-600 dark:text-violet-300" size={32} />
          <h2 className="mt-4 text-3xl font-black tracking-tight">Ready to publish your first QR code?</h2>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Free plan included — no credit card required.</p>
          <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-lg hover:bg-violet-500">
            Start Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 sm:px-6">
        <p>© {new Date().getFullYear()} QR Publish. <Link href="/" className="underline">Türkçe sayfa</Link> · <Link href="/privacy-policy" className="underline">Privacy Policy</Link></p>
      </footer>
    </main>
  );
}

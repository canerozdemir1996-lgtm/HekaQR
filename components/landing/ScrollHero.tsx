"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  ChefHat,
  FileText,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const featureBubbles = [
  { label: "Menü QR", icon: ChefHat, className: "left-[6%] top-[4%] lg:left-[7%] lg:top-[6%]" },
  { label: "Dinamik QR", icon: QrCode, className: "right-[10%] top-[3%] lg:right-[8%] lg:top-[5%]" },
  { label: "Raporlama", icon: BarChart3, className: "right-[1%] top-[33%] lg:right-0 lg:top-[32%]" },
  { label: "Wi-Fi QR", icon: Wifi, className: "right-[3%] top-[53%] lg:right-[1%] lg:top-[51%]" },
  { label: "Form QR", icon: FileText, className: "left-[1%] top-[42%] lg:left-0 lg:top-[43%]" },
  { label: "Kampanya QR", icon: Sparkles, className: "left-[17%] bottom-[6%] lg:left-[12%] lg:bottom-[7%]" },
];

const trustItems = [
  { title: "10.000+", text: "kullanıcı", icon: BadgeCheck },
  { title: "1M+", text: "tarama", icon: BarChart3 },
  { title: "Güvenli", text: "ve hızlı", icon: ShieldCheck },
  { title: "Dinamik", text: "içerik yönetimi", icon: QrCode },
  { title: "Canlı", text: "gerçek zamanlı ölçüm", icon: Sparkles },
];

const metrics = [
  { label: "Toplam Tarama", value: "1.248.320", delta: "+18.3%" },
  { label: "Aktif QR Kod", value: "256", delta: "+12.7%" },
  { label: "Tarama Oranı", value: "%62,4", delta: "+8.1%" },
  { label: "Oluşturulan QR", value: "342", delta: "+9.5%" },
];

const qrRows = [
  { title: "Menü QR", url: "qrpublish.com/menu", scans: "324.820", tone: "bg-orange-100 text-orange-700" },
  { title: "Dijital Kartvizit", url: "qrpublish.com/card", scans: "198.450", tone: "bg-violet-100 text-violet-700" },
  { title: "Kampanya Sayfası", url: "qrpublish.com/kampanya", scans: "142.390", tone: "bg-cyan-100 text-cyan-700" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

function FeatureBubble({ label, icon: Icon, className, index, reducedMotion }: (typeof featureBubbles)[number] & { index: number; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: [0, index % 2 ? -7 : 7, 0], scale: 1 }}
      transition={reducedMotion ? undefined : { opacity: { duration: 0.45, delay: 0.15 + index * 0.06 }, y: { duration: 5.5 + index * 0.4, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.45 } }}
      className={cn("absolute z-30 hidden items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_18px_46px_rgba(124,58,237,0.13)] backdrop-blur-xl lg:flex", className)}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Icon size={18} />
      </span>
      <span className="whitespace-nowrap text-sm font-black text-slate-950">{label}</span>
    </motion.div>
  );
}

function DashboardMockup({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 26, scale: 0.985 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
      className="relative rounded-[2rem] border border-white/80 bg-white/88 p-2 shadow-[0_42px_110px_rgba(15,23,42,0.13)] backdrop-blur-2xl sm:rounded-[2.4rem] sm:p-3"
    >
      <div className="overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white text-slate-950 sm:rounded-[1.95rem] lg:grid lg:grid-cols-[150px_1fr]">
        <aside className="hidden border-r border-slate-200/80 bg-slate-50/80 p-4 lg:block">
          <div className="text-sm font-black">QR Publish</div>
          <div className="mt-7 space-y-2">
            {["Genel Bakış", "QR Kodlar", "Raporlar", "Kampanyalar", "Ayarlar"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black",
                  index === 0 ? "bg-violet-100 text-violet-700" : "text-slate-500",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", index === 0 ? "bg-violet-500" : "bg-slate-300")} />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">Genel Bakış</p>
              <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Canlı QR performansı</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500">
              01 May - 31 May 2026
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                <p className="mt-2 text-lg font-black tracking-tight sm:text-xl">{metric.value}</p>
                <p className="mt-1 text-[10px] font-black text-emerald-500">
                  {metric.delta} <span className="text-slate-400">Bu ay</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[1.45rem] border border-slate-200 bg-gradient-to-b from-white to-violet-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black">Tarama Performansı</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Günlük trend ve yoğunluk</p>
                </div>
                <span className="rounded-xl bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">Günlük</span>
              </div>
              <div className="mt-4 h-32 rounded-2xl bg-white/70 px-3 py-4 sm:h-40">
                <svg viewBox="0 0 460 150" className="h-full w-full" fill="none" aria-hidden="true">
                  <path d="M0 126 C30 92 58 80 90 88 C122 96 130 116 162 104 C202 88 206 52 246 58 C286 64 284 108 326 100 C372 92 376 58 412 52 C434 48 446 38 460 22" stroke="url(#line)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M0 126 C30 92 58 80 90 88 C122 96 130 116 162 104 C202 88 206 52 246 58 C286 64 284 108 326 100 C372 92 376 58 412 52 C434 48 446 38 460 22 L460 150 L0 150 Z" fill="url(#fill)" />
                  <defs>
                    <linearGradient id="line" x1="0" y1="0" x2="460" y2="0">
                      <stop stopColor="#8b5cf6" />
                      <stop offset="1" stopColor="#14b8a6" />
                    </linearGradient>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="150">
                      <stop stopColor="#8b5cf6" stopOpacity="0.18" />
                      <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black">QR Listesi</p>
                <span className="rounded-xl bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white">Tümünü Gör</span>
              </div>
              <div className="space-y-2">
                {qrRows.map((row) => (
                  <div key={row.title} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", row.tone)}>
                      <QrCode size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">{row.title}</p>
                      <p className="truncate text-[10px] font-semibold text-slate-500">{row.url}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black">{row.scans}</p>
                      <p className="text-[10px] font-black text-emerald-500">+%16</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PhonePreview({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 28, rotate: 0 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: [0, -8, 0], rotate: -5 }}
      transition={reducedMotion ? undefined : { opacity: { duration: 0.55, delay: 0.35 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 0.55, delay: 0.35 } }}
      className="mx-auto mt-5 w-[208px] rounded-[2.1rem] bg-slate-950 p-2 shadow-[0_28px_70px_rgba(15,23,42,0.24)] sm:absolute sm:bottom-[-18px] sm:right-0 sm:mt-0 sm:w-[224px] lg:bottom-[-22px] lg:right-0 xl:w-[238px]"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] bg-white">
        <div className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="bg-[linear-gradient(180deg,#0f172a,#111827)] px-4 pb-5 pt-9 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Hoş Geldiniz</p>
          <h3 className="mt-2 text-2xl font-black">Piksel Erhan</h3>
          <p className="mt-1 text-xs font-semibold text-slate-300">Restoran menüsü</p>
        </div>
        <div className="space-y-2 bg-white p-3">
          {["Ana Yemekler", "İçecekler", "Tatlılar", "Kampanyalar"].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="text-xs font-black text-slate-950">{item}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                {index === 0 ? <ChefHat size={15} /> : index === 1 ? <Wifi size={15} /> : index === 2 ? <Sparkles size={15} /> : <ArrowRight size={15} />}
              </span>
            </div>
          ))}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 p-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-100">QR Publish</p>
            <p className="mt-1 text-xs font-bold leading-5">Menüyü aç, siparişi yönet.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ScrollHero({ authenticated = false }: { authenticated?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  return (
    <section className="relative mx-auto grid w-full max-w-[1440px] gap-10 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 lg:min-h-[760px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8 xl:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_9%_18%,rgba(124,58,237,0.14),transparent_28%),radial-gradient(circle_at_88%_24%,rgba(20,184,166,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.72))]" />

      <motion.div
        variants={fadeUp}
        initial={reducedMotion ? false : "hidden"}
        animate="visible"
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 min-w-0 max-w-2xl"
      >
        <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-black text-violet-700 shadow-sm backdrop-blur sm:text-sm">
          <Sparkles size={16} />
          Dinamik QR, menü, kartvizit ve raporlama tek panelde
        </div>

        <h1 className="text-[clamp(2.7rem,8vw,5.15rem)] font-black leading-[0.94] tracking-tight text-slate-950">
          QR kodlarınızı yayınlayın, yönetin ve ölçün.
        </h1>

        <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
          Dinamik QR, restoran menüsü, dijital kartvizit, kampanya sayfası, Wi-Fi ve kurumsal bildirim formları için modern QR çözümleri.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={authenticated ? "/dashboard" : "/signup"}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-7 py-4 text-sm font-black text-white shadow-[0_22px_42px_rgba(124,58,237,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_54px_rgba(124,58,237,0.34)] focus:outline-none focus:ring-4 focus:ring-violet-200 sm:w-auto"
          >
            {authenticated ? "Panele Git" : "Ücretsiz Dene"}
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <ArrowRight size={18} />
            </span>
          </Link>
          <a
            href="#features"
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-violet-200 bg-white/88 px-7 py-4 text-sm font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:w-auto"
          >
            Özellikleri İncele
            <ArrowRight size={18} />
          </a>
        </div>

      </motion.div>

      <div className="relative z-10 min-h-[560px] min-w-0 sm:min-h-[610px] lg:min-h-[680px]">
        <div className="absolute inset-x-2 top-5 h-[520px] rounded-[3rem] bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-3xl sm:inset-x-0" />
        <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-violet-400/12 blur-3xl" />
        <div className="absolute bottom-[18%] right-[4%] h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <svg className="absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 760 680" fill="none" aria-hidden="true">
          <path d="M84 216 C150 76 362 72 450 126 C570 200 610 352 540 496" stroke="rgba(139,92,246,0.22)" strokeDasharray="8 12" strokeLinecap="round" strokeWidth="1.6" />
          <path d="M210 548 C338 630 596 580 678 390" stroke="rgba(20,184,166,0.22)" strokeDasharray="8 12" strokeLinecap="round" strokeWidth="1.6" />
        </svg>

        {featureBubbles.map((bubble, index) => (
          <FeatureBubble key={bubble.label} {...bubble} index={index} reducedMotion={reducedMotion} />
        ))}

        <div className="relative mx-auto w-full max-w-[760px] pt-14 sm:pt-16 lg:pt-24">
          <DashboardMockup reducedMotion={reducedMotion} />
          <PhonePreview reducedMotion={reducedMotion} />
        </div>
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="relative z-20 grid min-w-0 gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
      >
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.title}-${item.text}`}
              className="flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/82 px-4 py-3 shadow-[0_14px_38px_rgba(148,163,184,0.12)] backdrop-blur-xl"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-base font-black leading-tight text-slate-950">{item.title}</span>
                <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{item.text}</span>
              </span>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}

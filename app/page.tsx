"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  ChefHat,
  FolderKanban,
  Layers3,
  Lock,
  Mail,
  MapPinned,
  Moon,
  Palette,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Users,
  Utensils,
  Wand2,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

const t = {
  login: "Giri\u015f Yap",
  navFeatures: "\u00d6zellikler",
  navMenu: "Men\u00fc QR",
  navPricing: "Fiyatland\u0131rma",
  navReports: "Raporlama",
  navFlow: "Ak\u0131\u015f",
};

const coreFeatures = [
  {
    icon: <RefreshCw size={20} />,
    title: "Dinamik QR y\u00f6netimi",
    desc: "Bas\u0131lm\u0131\u015f QR kodlar\u0131 de\u011fi\u015ftirmeden hedef URL, i\u00e7erik, kampanya ve y\u00f6nlendirme kurallar\u0131n\u0131 panelden g\u00fcncelleyin.",
  },
  {
    icon: <ChefHat size={20} />,
    title: "Restoran Men\u00fc QR",
    desc: "Logo, kapak, kategori, \u00fcr\u00fcn g\u00f6rseli, besin de\u011feri, indirim ve masa bazl\u0131 sipari\u015f ak\u0131\u015f\u0131n\u0131 tek yerden y\u00f6netin.",
  },
  {
    icon: <Users size={20} />,
    title: "Dijital kartvizitler",
    desc: "Kurumsal vCard \u015fablonlar\u0131, canl\u0131 \u00f6nizleme, rehbere kaydetme ve mobil uyumlu profil sayfalar\u0131 olu\u015fturun.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Detayl\u0131 raporlar",
    desc: "Toplam ve tekil tarama, \u00fclke, \u015fehir, cihaz, taray\u0131c\u0131, QR ve klas\u00f6r bazl\u0131 performans\u0131 anla\u015f\u0131l\u0131r grafiklerle izleyin.",
  },
  {
    icon: <Palette size={20} />,
    title: "QR st\u00fcdyosu",
    desc: "Renk, gradient, logo, g\u00f6z ve nokta stillerini \u00f6zelle\u015ftirip SVG, PNG ve PDF olarak \u00e7\u0131kt\u0131 al\u0131n.",
  },
  {
    icon: <FolderKanban size={20} />,
    title: "Klas\u00f6r ve toplu i\u015flem",
    desc: "QR ar\u015fivinizi klas\u00f6rlere ay\u0131r\u0131n; toplu indirme, toplu \u015fablon de\u011fi\u015ftirme ve toplu silme i\u015flemlerini kullan\u0131n.",
  },
];

const productModules = [
  "URL ve kampanya QR",
  "Men\u00fc QR ve masa sipari\u015fi",
  "Dijital kartvizit",
  "Wi-Fi, telefon, e-posta ve metin QR",
  "Klas\u00f6rler ve \u00e7\u00f6p kutusu",
  "Toplu QR olu\u015fturma",
  "QR tasar\u0131m \u015fablonlar\u0131",
  "Tarama analiti\u011fi",
  "Webhook, UTM, Pixel ve GTM",
  "Cihaz ve tarih bazl\u0131 y\u00f6nlendirme",
];

const reportItems = [
  {
    icon: <MapPinned size={22} />,
    title: "\u00dclke ve konum",
    text: "D\u00fcnya haritas\u0131, \u00fclke listesi, \u015fehir ve klas\u00f6r bazl\u0131 filtreleme.",
  },
  {
    icon: <Smartphone size={22} />,
    title: "Cihaz ve taray\u0131c\u0131",
    text: "Mobil, masa\u00fcst\u00fc, tablet, browser ve i\u015fletim sistemi da\u011f\u0131l\u0131m\u0131.",
  },
  {
    icon: <CalendarClock size={22} />,
    title: "Tarih aral\u0131\u011f\u0131",
    text: "7, 30, 90 g\u00fcn ve takvim bazl\u0131 \u00f6zel rapor aral\u0131klar\u0131.",
  },
  {
    icon: <ReceiptText size={22} />,
    title: "Sipari\u015f raporlar\u0131",
    text: "Masa sipari\u015fi, en \u00e7ok satan \u00fcr\u00fcnler, ciro ve indirim performans\u0131.",
  },
];

const workflow = [
  {
    step: "01",
    title: "\u0130\u00e7eri\u011fi olu\u015ftur",
    desc: "URL, kartvizit, restoran men\u00fcs\u00fc, katalog veya kampanya bilgilerini panelden girin.",
  },
  {
    step: "02",
    title: "QR tasar\u0131m\u0131n\u0131 yay\u0131na al",
    desc: "Renk, logo, \u015fablon, slug ve dinamik y\u00f6nlendirmeyi tek ak\u0131\u015fta ayarlay\u0131n.",
  },
  {
    step: "03",
    title: "\u00d6l\u00e7 ve g\u00fcncelle",
    desc: "Taramalar\u0131, sipari\u015fleri, cihazlar\u0131 ve kampanya etkisini raporlardan takip edin.",
  },
];

export default function LandingPage() {
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.14),transparent_28%)]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/25">
            <QrCode size={22} />
          </div>
          <span className="text-2xl font-black tracking-tight">QR Publish</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-violet-600">{t.navFeatures}</a>
          <a href="#menu" className="transition hover:text-violet-600">{t.navMenu}</a>
          <Link href="/pricing" className="transition hover:text-violet-600">{t.navPricing}</Link>
          <a href="#reports" className="transition hover:text-violet-600">{t.navReports}</a>
          <a href="#workflow" className="transition hover:text-violet-600">{t.navFlow}</a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            aria-label={"Tema de\u011fi\u015ftir"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/login" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100">
            {t.login}
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
              <Sparkles size={16} />
              {"Dinamik QR, men\u00fc, kartvizit ve raporlama tek panelde"}
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              {"QR kodlar\u0131n\u0131z\u0131 yay\u0131nlay\u0131n, y\u00f6netin ve \u00f6l\u00e7\u00fcn."}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {"QR Publish; restoran men\u00fcleri, dijital kartvizitler, kampanya QR'lar\u0131, klas\u00f6rler, toplu indirme ve detayl\u0131 analitik i\u00e7in web tabanl\u0131 yay\u0131n platformudur."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 text-sm font-black text-white shadow-xl shadow-violet-500/25 transition hover:-translate-y-1 hover:bg-violet-700">
                {"Panele Giri\u015f"} <ArrowRight size={18} />
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-7 py-4 text-sm font-black text-violet-700 transition hover:-translate-y-1 hover:border-violet-300 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
                {t.navPricing}
              </Link>
              <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-800 transition hover:-translate-y-1 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-white">
                {"\u00d6zellikleri \u0130ncele"}
              </a>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-slate-200 bg-white/80 p-4 shadow-2xl shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/25">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["10+", "QR modeli"],
                ["Canl\u0131", "\u00f6nizleme"],
                ["SVG/PNG/PDF", "\u00e7\u0131kt\u0131"],
                ["Anl\u0131k", "rapor"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950/45">
                  <div className="text-3xl font-black text-violet-600 dark:text-violet-300">{value}</div>
                  <div className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-200">{"Canl\u0131 operasyon"}</p>
                  <h2 className="mt-3 text-2xl font-black">{"Men\u00fc QR sipari\u015fi ve tarama analiti\u011fi"}</h2>
                </div>
                <ReceiptText className="text-emerald-300" size={34} />
              </div>
              <div className="mt-6 grid gap-3">
                {["Masa 23 sipari\u015fi al\u0131nd\u0131", "Kategori bazl\u0131 indirim aktif", "Bug\u00fcn 128 tarama"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-bold">
                    <Check size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Platform</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{"QR Publish ile yay\u0131nda olan ana yetenekler"}</h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              {"Anasayfa art\u0131k panelde bulunan ger\u00e7ek mod\u00fclleri anlat\u0131r: dinamik QR, men\u00fc, sipari\u015f, dijital kartvizit, raporlar, klas\u00f6rler ve toplu i\u015flemler."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((feature) => (
              <article key={feature.title} className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:shadow-black/30">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">{feature.icon}</div>
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-8 rounded-[2.5rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/25 md:p-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                <Utensils size={26} />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Restoran modu</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{"Men\u00fc QR sadece liste de\u011fil, sipari\u015f ak\u0131\u015f\u0131d\u0131r."}</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
                {"Restoran sahibi masa say\u0131s\u0131n\u0131 girer, sistem her masa i\u00e7in ayr\u0131 dinamik QR \u00fcretir. M\u00fc\u015fteri masa QR'\u0131n\u0131 okutur, sepetini onaylar; sipari\u015f panele masa numaras\u0131, not ve toplam tutarla d\u00fc\u015fer."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Men\u00fc i\u00e7eri\u011fi", text: "Kategori, \u00fcr\u00fcn, fiyat, g\u00f6rsel ve besin de\u011ferleri." },
                { title: "\u0130ndirim plan\u0131", text: "Tarih aral\u0131\u011f\u0131, kategori veya \u00fcr\u00fcn bazl\u0131 indirim." },
                { title: "Masa QR", text: "Her masa i\u00e7in ayr\u0131 QR ve toplu yazd\u0131rma." },
                { title: "Sipari\u015f fi\u015fi", text: "Mutfa\u011fa verilebilecek, mali de\u011feri yoktur notlu \u00f6rnek fi\u015f." },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950/40">
                  <Check className="mb-4 text-emerald-600 dark:text-emerald-300" size={20} />
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="reports" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Raporlama</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{"QR performans\u0131n\u0131 nereden geldi\u011fine kadar g\u00f6r\u00fcn."}</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
                {"Tarama raporlar\u0131 yaln\u0131zca say\u0131 g\u00f6stermez. Hangi QR, hangi klas\u00f6r, hangi cihaz, hangi \u00fclke ve hangi tarih aral\u0131\u011f\u0131 daha iyi \u00e7al\u0131\u015f\u0131yor sorular\u0131na cevap verir."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {reportItems.map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white/75 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">{item.icon}</div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Layers3 className="text-violet-600 dark:text-violet-300" />
              <h2 className="text-2xl font-black">{"Mod\u00fcl listesi"}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {productModules.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  <BadgeCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-12 text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{"Nas\u0131l \u00e7al\u0131\u015f\u0131r?"}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{"\u00dc\u00e7 ad\u0131mda yay\u0131na al\u0131n"}</h2>
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
          <div className="rounded-[2.5rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-300/30 dark:border-white/10 dark:shadow-black/30 md:p-14">
            <Wand2 className="mx-auto mb-5 text-violet-300" size={32} />
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{"QR operasyonunuzu tek panelde toplay\u0131n."}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              {"Bas\u0131l\u0131 materyal, restoran masas\u0131, katalog, kartvizit veya kampanya fark etmez. QR Publish ile yay\u0131nlad\u0131ktan sonra y\u00f6netmeye devam edersiniz."}
            </p>
            <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-violet-100">
              {t.login} <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/85 py-12 backdrop-blur dark:border-white/10 dark:bg-[#030712]/85">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white"><QrCode size={18} /></div>
              <span className="text-xl font-black">QR Publish</span>
            </div>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
              {"Dinamik QR kod, restoran men\u00fcs\u00fc, dijital kartvizit, raporlama ve toplu y\u00f6netim i\u00e7in web tabanl\u0131 yay\u0131n platformu."}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{"\u00dcr\u00fcn"}</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li>Dinamik QR</li>
              <li>{"Men\u00fc QR"}</li>
              <li>Dijital kartvizit</li>
              <li><Link href="/pricing" className="hover:text-violet-600 dark:hover:text-violet-300">{t.navPricing}</Link></li>
              <li>{"QR raporlar\u0131"}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{"G\u00fcven"}</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><ShieldCheck size={15} /> {"Rol bazl\u0131 eri\u015fim"}</li>
              <li className="flex items-center gap-2"><Lock size={15} /> {"\u015eifreli QR deste\u011fi"}</li>
              <li className="flex items-center gap-2"><BellRing size={15} /> Webhook bildirimleri</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Bilgi</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li>{"\u00a9 2026 QR Publish"}</li>
              <li>{"KVKK ve gizlilik odakl\u0131 yap\u0131"}</li>
              <li>{"Next.js, Supabase altyap\u0131s\u0131"}</li>
              <li className="flex items-center gap-2"><Mail size={15} /> {"Destek i\u00e7in panel i\u00e7i mesajlar"}</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

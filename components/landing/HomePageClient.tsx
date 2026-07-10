"use client"

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ScrollHero from "@/components/landing/ScrollHero";
import InstantQrGenerator from "@/components/landing/InstantQrGenerator";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  ChefHat,
  CircleUserRound,
  FileCheck2,
  FolderKanban,
  Gauge,
  Layers3,
  Lock,
  Mail,
  MapPinned,
  Menu,
  Moon,
  Palette,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  Utensils,
  Wand2,
  Wifi,
  X,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useSession } from "@/hooks/useSupabaseSession";

const t = {
  login: "Giriş Yap",
  navFeatures: "Özellikler",
  navTypes: "QR Tipleri",
  navMenu: "Menü QR",
  navPricing: "Fiyatlandırma",
  navReports: "Raporlama",
  navFlow: "Akış",
  navSecurity: "Güvenlik",
};

const coreFeatures = [
  {
    icon: <RefreshCw size={20} />,
    title: "Dinamik QR yönetimi",
    desc: "Basılmış QR kodları değiştirmeden hedef URL, içerik, kampanya ve yönlendirme kurallarını panelden güncelleyin.",
  },
  {
    icon: <ChefHat size={20} />,
    title: "Restoran Menü QR",
    desc: "Logo, kapak, kategori, ürün görseli, besin değeri, indirim ve masa bazlı sipariş akışını tek yerden yönetin.",
  },
  {
    icon: <Users size={20} />,
    title: "Dijital kartvizitler",
    desc: "Kurumsal vCard şablonları, canlı önizleme, rehbere kaydetme ve mobil uyumlu profil sayfaları oluşturun.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Detaylı raporlar",
    desc: "Toplam ve tekil tarama, ülke, şehir, cihaz, tarayıcı, QR ve klasör bazlı performansı anlaşılır grafiklerle izleyin.",
  },
  {
    icon: <Palette size={20} />,
    title: "QR stüdyosu",
    desc: "Renk, gradient, logo, göz ve nokta stillerini özelleştirip SVG, PNG ve PDF olarak çıktı alın.",
  },
  {
    icon: <FolderKanban size={20} />,
    title: "Klasör ve toplu işlem",
    desc: "QR arşivinizi klasörlere ayırın; toplu indirme, toplu şablon değiştirme ve toplu silme işlemlerini kullanın.",
  },
];

const productModules = [
  "URL ve kampanya QR",
  "Menü QR ve masa siparişi",
  "Dijital kartvizit",
  "Wi-Fi, telefon, e-posta ve metin QR",
  "Klasörler ve çöp kutusu",
  "Toplu QR oluşturma",
  "QR tasarım şablonları",
  "Tarama analitiği",
  "Webhook, UTM, Pixel ve GTM",
  "Cihaz ve tarih bazlı yönlendirme",
];

const qrTypeHighlights = [
  {
    icon: <Wifi size={18} />,
    title: "Wi-Fi, telefon, e-posta ve WhatsApp QR",
  },
  {
    icon: <CircleUserRound size={18} />,
    title: "Dijital kartvizit ve Multi URL sayfaları",
  },
  {
    icon: <ArrowRight size={18} />,
    title: "Kampanya, katalog ve cihaz bazlı yönlendirme",
  },
  {
    icon: <Utensils size={18} />,
    title: "Restoran menüsü, masa QR ve sipariş akışı",
  },
];

const qrTypeCardBullets = [
  "Kampanya bazlı yönlendirme",
  "UTM, Pixel ve GTM desteği",
  "Cihaz ve tarih bazlı kurallar",
];

const reportItems = [
  {
    icon: <MapPinned size={22} />,
    title: "Ülke ve konum",
    text: "Dünya haritası, ülke listesi, şehir ve klasör bazlı filtreleme.",
  },
  {
    icon: <Smartphone size={22} />,
    title: "Cihaz ve tarayıcı",
    text: "Mobil, masaüstü, tablet, browser ve işletim sistemi dağılımı.",
  },
  {
    icon: <CalendarClock size={22} />,
    title: "Tarih aralığı",
    text: "7, 30, 90 gün ve takvim bazlı özel rapor aralıkları.",
  },
  {
    icon: <ReceiptText size={22} />,
    title: "Sipariş raporları",
    text: "Masa siparişi, en çok satan ürünler, ciro ve indirim performansı.",
  },
];

const trustSignals = [
  {
    icon: <Users size={20} />,
    title: "Rol bazlı erişim",
    text: "Organizasyon üyelerine sahip, yönetici, editör ve görüntüleyici rolleri atayın; herkes sadece yetkisi olan QR'ları görür.",
  },
  {
    icon: <Lock size={20} />,
    title: "Şifre korumalı QR",
    text: "Hassas içerikler için QR'ı şifreyle koruyun; sadece doğru şifreyi girenler hedef sayfaya ulaşır.",
  },
  {
    icon: <Gauge size={20} />,
    title: "Brute-force koruması",
    text: "Giriş denemeleri IP ve hesap bazlı hız sınırlamasıyla korunur; otomatik şifre deneme saldırılarına karşı sınırlandırılır.",
  },
  {
    icon: <BellRing size={20} />,
    title: "Webhook bildirimleri",
    text: "Tarama, sipariş, form ve rezervasyon olaylarını kendi sisteminize veya Zapier/Make gibi araçlara webhook ile iletin.",
  },
  {
    icon: <FileCheck2 size={20} />,
    title: "Gizlilik bilgileri",
    text: "Veri işleme ve kullanıcı haklarına ilişkin bilgiler için Gizlilik Politikası'nı inceleyin.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Oturum güvenliği",
    text: "Oturum ve erişim kontrolleri, yetkili kullanıcıların platform özelliklerine erişmesini sağlamak için uygulanır.",
  },
];

const workflow = [
  {
    step: "01",
    title: "İçeriği oluştur",
    desc: "URL, kartvizit, restoran menüsü, katalog veya kampanya bilgilerini panelden girin.",
  },
  {
    step: "02",
    title: "QR tasarımını yayına al",
    desc: "Renk, logo, şablon, slug ve dinamik yönlendirmeyi tek akışta ayarlayın.",
  },
  {
    step: "03",
    title: "Ölç ve güncelle",
    desc: "Taramaları, siparişleri, cihazları ve kampanya etkisini raporlardan takip edin.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
  tone = "violet",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  tone?: "violet" | "emerald";
}) {
  const toneClass = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-violet-600 dark:text-violet-300";

  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`text-sm font-black uppercase tracking-[0.22em] ${toneClass}`}>{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{title}</h2>
      {description ? (
        <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  const [theme, toggleTheme] = useTheme();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = [
    { href: "#features", label: t.navFeatures },
    { href: "#qr-types", label: t.navTypes },
    { href: "#menu", label: t.navMenu },
    { href: "/pricing", label: t.navPricing },
    { href: "#reports", label: t.navReports },
    { href: "#guvenlik", label: t.navSecurity },
    { href: "#workflow", label: t.navFlow },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050713] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.14),transparent_28%)]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo priority className="w-[176px] sm:w-[210px]" width={420} height={134} />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-violet-600">
            {t.navFeatures}
          </a>
          <a href="#qr-types" className="transition hover:text-violet-600">
            {t.navTypes}
          </a>
          <a href="#menu" className="transition hover:text-violet-600">
            {t.navMenu}
          </a>
          <Link href="/pricing" className="transition hover:text-violet-600">
            {t.navPricing}
          </Link>
          <a href="#reports" className="transition hover:text-violet-600">
            {t.navReports}
          </a>
          <a href="#guvenlik" className="transition hover:text-violet-600">
            {t.navSecurity}
          </a>
          <a href="#workflow" className="transition hover:text-violet-600">
            {t.navFlow}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            aria-label="Tema değiştir"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {status === "loading" ? (
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" aria-label="Oturum kontrol ediliyor" />
          ) : authenticated ? (
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100 sm:max-w-[180px] sm:px-4"
            >
              <CircleUserRound size={18} className="shrink-0" />
              <span className="hidden truncate sm:inline">{session?.user?.name || session?.user?.email || "Profilim"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
            >
              {t.login}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 md:hidden"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="relative z-20 mx-4 mb-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b0d17]/95 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-bold text-slate-600 dark:text-slate-300">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-white/5"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>
      )}

      <main className="relative z-10">
        <ScrollHero authenticated={authenticated} />

        <InstantQrGenerator />

        <section
          id="qr-types"
          className="landing-section-full-bleed bg-[linear-gradient(110deg,rgba(244,238,255,0.92),rgba(255,255,255,0.98)_48%,rgba(231,248,243,0.92))] py-16 dark:bg-[linear-gradient(110deg,rgba(23,18,39,0.95),rgba(7,9,20,0.98)_48%,rgba(6,28,26,0.96))] md:py-24"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="QR Tipleri"
                title="Her kullanım senaryosu için ayrı bir QR akışı kurun."
                description="URL yönlendirmeden restoran menüsüne, dijital kartvizitten çoklu link sayfalarına kadar farklı QR tiplerini tek panelde yönetebilirsiniz."
              />
              <div className="mt-8 grid gap-3">
                {qrTypeHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-[1.4rem] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(148,163,184,0.10)] dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {item.icon}
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-[2.75rem] px-2 py-4 sm:min-h-[520px]">
              <div className="absolute right-5 top-12 h-[72%] w-[54%] rounded-[2rem] bg-[#222634] opacity-80 shadow-[0_40px_80px_rgba(15,23,42,0.32)] rotate-[10deg]" />
              <div className="absolute right-12 top-7 h-[76%] w-[57%] rounded-[2rem] bg-[#171a25] opacity-90 shadow-[0_40px_80px_rgba(15,23,42,0.38)] rotate-[5deg]" />
              <div className="absolute right-0 top-0 h-[82%] w-[62%] overflow-hidden rounded-[2.2rem] bg-slate-950 shadow-[0_44px_92px_rgba(15,23,42,0.45)]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#2a2d3a,#2a2d3a_14px,#232631_14px,#232631_28px)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,14,23,0.35),rgba(8,10,18,0.92))]" />
                <div className="relative flex h-full flex-col p-6 text-white sm:p-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-violet-100">
                    <QrCode size={14} />
                    QR Tipi
                  </div>
                  <div className="mt-auto">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">Kampanya ve yönlendirme</p>
                    <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-[2.1rem]">Dinamik URL QR</h3>
                    <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-300">
                      Basılı QR&apos;ı yeniden üretmeden hedef URL, UTM, cihaz bazlı yönlendirme ve A/B testi akışlarını panelden değiştirin.
                    </p>
                    <div className="mt-6 space-y-3">
                      {qrTypeCardBullets.map((item) => (
                        <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-100">
                          <Check size={16} className="text-violet-300" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHeader
            eyebrow="Platform"
            title="QR Publish ile yayında olan ana yetenekler"
            description="Anasayfa artık panelde bulunan gerçek modülleri anlatır: dinamik QR, menü, sipariş, dijital kartvizit, raporlar, klasörler ve toplu işlemler."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {coreFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-7 shadow-[0_22px_60px_rgba(148,163,184,0.08)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_70px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">{feature.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-8 rounded-[2.5rem] border border-emerald-100 bg-[linear-gradient(145deg,#effcf5,#f8fdf9)] p-6 shadow-[0_28px_80px_rgba(16,185,129,0.08)] dark:border-emerald-500/15 dark:bg-[linear-gradient(145deg,rgba(5,31,25,0.95),rgba(10,27,23,0.88))] md:p-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <Utensils size={26} />
              </div>
              <SectionHeader
                eyebrow="Restoran Modu"
                title="Menü QR sadece liste değil, sipariş akışıdır."
                description="Restoran sahibi masa sayısını girer, sistem her masa için ayrı dinamik QR üretir. Müşteri masa QR'ını okutur, sepetini onaylar; sipariş panele masa numarası, not ve toplam tutarla düşer."
                tone="emerald"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Menü içeriği", text: "Kategori, ürün, fiyat, görsel ve besin değerleri." },
                { title: "İndirim planı", text: "Tarih aralığı, kategori veya ürün bazlı indirim." },
                { title: "Masa QR", text: "Her masa için ayrı QR ve toplu yazdırma." },
                { title: "Sipariş fişi", text: "Mutfağa verilebilecek, mali değeri yoktur notlu örnek fiş." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <Check className="mb-4 text-emerald-600 dark:text-emerald-300" size={18} />
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="reports" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <SectionHeader
              eyebrow="Raporlama"
              title="QR performansını nereden geldiğine kadar görün."
              description="Tarama raporları yalnızca sayı göstermez. Hangi QR, hangi klasör, hangi cihaz, hangi ülke ve hangi tarih aralığı daha iyi çalışıyor sorularına cevap verir."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {reportItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-white/10 dark:bg-white/[0.04] md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <Layers3 size={20} />
              </div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Modül listesi</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {productModules.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-[1rem] border border-slate-200/80 bg-slate-50/90 px-3 py-3 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200"
                >
                  <BadgeCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="guvenlik"
          className="bg-[linear-gradient(110deg,rgba(244,238,255,0.9),rgba(255,255,255,0.98)_48%,rgba(231,248,243,0.9))] py-16 dark:bg-[linear-gradient(110deg,rgba(23,18,39,0.95),rgba(7,9,20,0.98)_48%,rgba(6,28,26,0.96))] md:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeader
              eyebrow="Güvenlik & Uyumluluk"
              title="Gerçek güvenlik önlemleri, vaat değil."
              description="Bağımsız sertifikasyon süreçlerimiz henüz tamamlanmadı; bu yüzden burada sadece platformda fiilen çalışan güvenlik ve uyumluluk önlemlerini listeliyoruz."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {trustSignals.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.8rem] border border-emerald-100 bg-[linear-gradient(160deg,#f4fbf7,#fbfefc)] p-6 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-emerald-500/15 dark:bg-[linear-gradient(160deg,rgba(11,32,25,0.92),rgba(10,21,19,0.9))]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-5 rounded-[1.8rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-white/10 dark:bg-white/[0.04] md:flex-row md:items-center md:p-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <Wifi size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-950 dark:text-white">NFC etiketleriyle de çalışır</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                  QR Publish&apos;te oluşturduğunuz dinamik link sadece bir QR koda değil, herhangi bir NFC etiketine de yazılabilir. Müşterileriniz QR&apos;ı okutsun veya telefonunu etikete dokundursun, sonuç aynı sayfaya çıkar.
                </p>
              </div>
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200 md:flex">
                <Smartphone size={24} />
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHeader eyebrow="Nasıl Çalışır?" title="Üç adımda yayına alın" centered />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="rounded-[1.8rem] border border-slate-200/80 bg-white/90 p-7 shadow-[0_18px_48px_rgba(148,163,184,0.08)] dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="text-4xl font-black text-violet-600 dark:text-violet-300">{item.step}</div>
                <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="relative overflow-hidden rounded-[2.4rem] bg-[#090d1b] px-6 py-12 text-center shadow-[0_42px_100px_rgba(15,23,42,0.24)] md:px-14 md:py-16">
            <div className="pointer-events-none absolute left-1/2 mt-[-2rem] h-36 w-80 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <Wand2 size={28} />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl">QR operasyonunuzu tek panelde toplayın.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300">
                Basılı materyal, restoran masası, katalog, kartvizit veya kampanya fark etmez. QR Publish ile yayınladıktan sonra yönetmeye devam edersiniz.
              </p>
              <Link
                href={authenticated ? "/dashboard" : "/signup"}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-violet-100"
              >
                {authenticated ? "Panele Git" : "Ücretsiz Dene"} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/90 py-12 backdrop-blur dark:border-white/10 dark:bg-[#030712]/85">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="w-[164px] sm:w-[188px]" width={420} height={134} />
            </div>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
              Dinamik QR kod, restoran menüsü, dijital kartvizit, raporlama ve toplu yönetim için web tabanlı yayın platformu.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Ürün</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li><Link href="/dinamik-qr-kod-olusturucu" className="hover:text-violet-600 dark:hover:text-violet-300">Dinamik QR</Link></li>
              <li><Link href="/restoran-qr-menu" className="hover:text-violet-600 dark:hover:text-violet-300">Menü QR</Link></li>
              <li><Link href="/vcard-qr-kod-olusturucu" className="hover:text-violet-600 dark:hover:text-violet-300">Dijital kartvizit</Link></li>
              <li>
                <Link href="/pricing" className="hover:text-violet-600 dark:hover:text-violet-300">
                  {t.navPricing}
                </Link>
              </li>
              <li><Link href="/qr-kod-analiz" className="hover:text-violet-600 dark:hover:text-violet-300">QR raporları</Link></li>
              <li>
                <Link href="/developers" className="hover:text-violet-600 dark:hover:text-violet-300">
                  API Dokümantasyonu
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Güven</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <ShieldCheck size={15} /> Rol bazlı erişim
              </li>
              <li className="flex items-center gap-2">
                <Lock size={15} /> Şifreli QR desteği
              </li>
              <li className="flex items-center gap-2">
                <Gauge size={15} /> Brute-force koruması
              </li>
              <li className="flex items-center gap-2">
                <BellRing size={15} /> Webhook bildirimleri
              </li>
              <li>
                <a href="#guvenlik" className="font-black text-violet-600 hover:text-violet-700 dark:text-violet-300">
                  Tüm güvenlik önlemleri →
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Bilgi</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li>© 2026 QR Publish</li>
              <li>KVKK ve gizlilik odaklı yapı</li>
              <li>Modern bulut altyapısı</li>
              <li className="flex items-center gap-2">
                <Mail size={15} /> Destek için panel içi mesajlar
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-violet-600 dark:hover:text-violet-300">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-violet-600 dark:hover:text-violet-300">
                  Kullanım Şartları
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-violet-600 dark:hover:text-violet-300">
                  Çerez Politikası
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

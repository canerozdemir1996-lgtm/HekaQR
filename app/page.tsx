"use client";

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
  CircleUserRound,
} from "lucide-react";
import { ShuffleCards } from "@/components/ui/demo";
import { useTheme } from "@/lib/theme";
import { useSession } from "next-auth/react";

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
  "Wi-Fi, telefon, e-posta ve WhatsApp QR",
  "Dijital kartvizit ve Multi URL sayfaları",
  "Kampanya, katalog ve cihaz bazlı yönlendirme",
  "Restoran menüsü, masa QR ve sipariş akışı",
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
    title: "KVKK uyumlu veri işleme",
    text: "Kişisel verileriniz KVKK'ya uygun şekilde işlenir; aydınlatma metni ve veri saklama politikaları gizlilik sayfamızda açıkça belirtilir.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Oturum güvenliği",
    text: "Kimlik doğrulama NextAuth üzerinden yönetilir; şifreler ve oturum bilgileri sektör standardı şifreleme ile saklanır.",
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
          <a href="#features" className="transition hover:text-violet-600">{t.navFeatures}</a>
          <a href="#qr-types" className="transition hover:text-violet-600">{t.navTypes}</a>
          <a href="#menu" className="transition hover:text-violet-600">{t.navMenu}</a>
          <Link href="/pricing" className="transition hover:text-violet-600">{t.navPricing}</Link>
          <a href="#reports" className="transition hover:text-violet-600">{t.navReports}</a>
          <a href="#guvenlik" className="transition hover:text-violet-600">{t.navSecurity}</a>
          <a href="#workflow" className="transition hover:text-violet-600">{t.navFlow}</a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            aria-label="Tema değiştir"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {status === "loading" ? (
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" aria-label="Oturum kontrol ediliyor" />
          ) : authenticated ? (
            <Link href="/dashboard/profile" className="inline-flex max-w-[180px] items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100">
              <CircleUserRound size={18} className="shrink-0" />
              <span className="truncate">{session?.user?.name || session?.user?.email || "Profilim"}</span>
            </Link>
          ) : (
            <Link href="/login" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100">
              {t.login}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 md:hidden"
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
              )
            )}
          </nav>
        </div>
      )}

      <main className="relative z-10">
        <ScrollHero authenticated={authenticated} />

        <InstantQrGenerator />

        <section id="qr-types" className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">QR Tipleri</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Her kullanım senaryosu için ayrı bir QR akışı kurun.</h2>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              URL yönlendirmeden restoran menüsüne, dijital kartvizitten çoklu link sayfalarına kadar farklı QR tiplerini tek panelde yönetebilirsiniz. Kartları sola sürükleyerek öne çıkan tipleri gezin.
            </p>
            <div className="mt-8 grid gap-3">
              {qrTypeHighlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                    <Wifi size={18} />
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-visible py-4 lg:min-h-[560px]">
            <div className="absolute inset-x-8 top-10 h-[420px] rounded-[3rem] bg-white/55 blur-3xl dark:bg-white/[0.04]" />
            <div className="absolute left-0 top-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10" />
            <div className="absolute bottom-6 right-0 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-400/10" />
            <ShuffleCards />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Platform</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">QR Publish ile yayında olan ana yetenekler</h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              Anasayfa artık panelde bulunan gerçek modülleri anlatır: dinamik QR, menü, sipariş, dijital kartvizit, raporlar, klasörler ve toplu işlemler.
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
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Menü QR sadece liste değil, sipariş akışıdır.</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
                Restoran sahibi masa sayısını girer, sistem her masa için ayrı dinamik QR üretir. Müşteri masa QR&apos;ını okutur, sepetini onaylar; sipariş panele masa numarası, not ve toplam tutarla düşer.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Menü içeriği", text: "Kategori, ürün, fiyat, görsel ve besin değerleri." },
                { title: "İndirim planı", text: "Tarih aralığı, kategori veya ürün bazlı indirim." },
                { title: "Masa QR", text: "Her masa için ayrı QR ve toplu yazdırma." },
                { title: "Sipariş fişi", text: "Mutfağa verilebilecek, mali değeri yoktur notlu örnek fiş." },
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
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">QR performansını nereden geldiğine kadar görün.</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
                Tarama raporları yalnızca sayı göstermez. Hangi QR, hangi klasör, hangi cihaz, hangi ülke ve hangi tarih aralığı daha iyi çalışıyor sorularına cevap verir.
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
              <h2 className="text-2xl font-black">Modül listesi</h2>
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

        <section id="guvenlik" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Güvenlik &amp; Uyumluluk</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Gerçek güvenlik önlemleri, vaat değil.</h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">
              Bağımsız sertifikasyon süreçlerimiz henüz tamamlanmadı; bu yüzden burada sadece platformda fiilen çalışan güvenlik ve uyumluluk önlemlerini listeliyoruz.
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

        <section id="workflow" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-12 text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Nasıl çalışır?</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Üç adımda yayına alın</h2>
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
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">QR operasyonunuzu tek panelde toplayın.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              Basılı materyal, restoran masası, katalog, kartvizit veya kampanya fark etmez. QR Publish ile yayınladıktan sonra yönetmeye devam edersiniz.
            </p>
            <Link href={authenticated ? "/dashboard" : "/signup"} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-violet-100">
              {authenticated ? "Panele Git" : "Ücretsiz Dene"} <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/85 py-12 backdrop-blur dark:border-white/10 dark:bg-[#030712]/85">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
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
              <li>Dinamik QR</li>
              <li>Menü QR</li>
              <li>Dijital kartvizit</li>
              <li><Link href="/pricing" className="hover:text-violet-600 dark:hover:text-violet-300">{t.navPricing}</Link></li>
              <li>QR raporları</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Güven</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><ShieldCheck size={15} /> Rol bazlı erişim</li>
              <li className="flex items-center gap-2"><Lock size={15} /> Şifreli QR desteği</li>
              <li className="flex items-center gap-2"><Gauge size={15} /> Brute-force koruması</li>
              <li className="flex items-center gap-2"><BellRing size={15} /> Webhook bildirimleri</li>
              <li><a href="#guvenlik" className="hover:text-violet-600 dark:hover:text-violet-300">Tüm güvenlik önlemleri →</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Bilgi</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li>© 2026 QR Publish</li>
              <li>KVKK ve gizlilik odaklı yapı</li>
              <li>Next.js, Supabase altyapısı</li>
              <li className="flex items-center gap-2"><Mail size={15} /> Destek için panel içi mesajlar</li>
              <li><Link href="/privacy-policy" className="hover:text-violet-600 dark:hover:text-violet-300">Gizlilik Politikasi</Link></li>
              <li><Link href="/terms" className="hover:text-violet-600 dark:hover:text-violet-300">Kullanim Sartlari</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-violet-600 dark:hover:text-violet-300">Cerez Politikasi</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

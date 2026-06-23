"use client";

import { Building2, CheckCircle2, ChevronRight, ExternalLink, ImageIcon, Link2, QrCode, Store, UtensilsCrossed, UserCircle } from "lucide-react";
import { Button } from "@/lib/button-system-2026";
import type { QrCode as QrCodeRecord } from "@/lib/supabase";

export type OnboardingBusinessType = "restaurant" | "retail" | "service" | "personal";

const BUSINESS_OPTIONS: Array<{
  id: OnboardingBusinessType;
  title: string;
  description: string;
  hint: string;
  icon: typeof UtensilsCrossed;
}> = [
  {
    id: "restaurant",
    title: "Restoran",
    description: "Menü, masa siparişi ve kampanya QR akışlarıyla başlayın.",
    hint: "Öneri: Menü QR veya Kampanya QR",
    icon: UtensilsCrossed,
  },
  {
    id: "retail",
    title: "Mağaza",
    description: "Ürün sayfası, indirim ve yönlendirme QR'larını tek panelde yönetin.",
    hint: "Öneri: Dinamik URL veya Ürün QR",
    icon: Store,
  },
  {
    id: "service",
    title: "Hizmet",
    description: "Rezervasyon, form ve bilgilendirme akışları için hızlı kurulum yapın.",
    hint: "Öneri: Rezervasyon veya Geri Bildirim QR",
    icon: Building2,
  },
  {
    id: "personal",
    title: "Kişisel",
    description: "Kartvizit, çoklu link ve sosyal profil sayfalarınızı yayınlayın.",
    hint: "Öneri: vCard veya Multi URL QR",
    icon: UserCircle,
  },
];

export default function OnboardingWizard({
  open,
  step,
  businessType,
  createdQr,
  previewUrl,
  onBusinessTypeChange,
  onNext,
  onBack,
  onLater,
  onOpenBuilder,
  onComplete,
  onCopyLink,
  onDownloadPng,
  onDownloadSvg,
}: {
  open: boolean;
  step: 1 | 2 | 3;
  businessType: OnboardingBusinessType;
  createdQr: QrCodeRecord | null;
  previewUrl: string;
  onBusinessTypeChange: (value: OnboardingBusinessType) => void;
  onNext: () => void;
  onBack: () => void;
  onLater: () => void;
  onOpenBuilder: () => void;
  onComplete: () => void;
  onCopyLink: () => void;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
}) {
  if (!open) return null;

  const currentOption = BUSINESS_OPTIONS.find((item) => item.id === businessType) ?? BUSINESS_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onLater} aria-label="Kurulumu sonra yap" />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.2rem] border border-white/10 bg-white shadow-2xl dark:bg-slate-950">
        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#ede9fe,transparent_34%),linear-gradient(180deg,#f8f7ff,#eef4ff)] p-6 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_34%),linear-gradient(180deg,#0b1020,#111827)] lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Kurulum sihirbazı</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">İlk QR yayınınızı birkaç adımda canlıya alın.</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              İşletme tipinizi seçin, ilk QR'ınızı oluşturun ve hemen indirme bağlantılarına erişin.
            </p>
            <div className="mt-8 space-y-3">
              {[
                ["01", "İşletme tipi", "Akış önerilerini buna göre şekillendiriyoruz."],
                ["02", "İlk QR oluştur", "Mevcut QR oluşturma ekranı doğrudan açılır."],
                ["03", "İndir ve paylaş", "PNG, SVG ve yayın linki hazır olur."],
              ].map(([index, title, text], order) => {
                const active = step === order + 1;
                const done = step > order + 1;
                return (
                  <div key={index} className={`rounded-2xl border px-4 py-3 transition ${active ? "border-violet-400 bg-white text-slate-950 shadow-lg shadow-violet-200/60 dark:bg-white/10 dark:text-white" : "border-white/40 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-200"}`}>
                        {done ? <CheckCircle2 size={14} /> : index}
                      </span>
                      <div>
                        <p className="text-sm font-black">{title}</p>
                        <p className="mt-1 text-xs font-semibold opacity-80">{text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="p-6 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Adım {step} / 3</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {step === 1 ? "İşletme tipinizi seçin" : step === 2 ? "İlk QR'ınızı oluşturun" : "QR'ınız hazır"}
                </h3>
              </div>
              <button type="button" onClick={onLater} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                Sonra yap
              </button>
            </div>

            {step === 1 && (
              <div>
                <div className="grid gap-3 md:grid-cols-2">
                  {BUSINESS_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const active = businessType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onBusinessTypeChange(item.id)}
                        className={`rounded-[1.6rem] border p-4 text-left transition ${active ? "border-violet-400 bg-violet-50 shadow-lg shadow-violet-100/80 dark:border-violet-400/40 dark:bg-violet-500/10" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"}`}
                      >
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200"}`}>
                          <Icon size={20} />
                        </span>
                        <p className="mt-4 text-base font-black text-slate-950 dark:text-white">{item.title}</p>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
                        <p className="mt-3 text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">{item.hint}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button variant="secondary" onClick={onLater}>Daha sonra</Button>
                  <Button onClick={onNext}>
                    Devam Et
                    <ChevronRight size={15} />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{currentOption.title}</p>
                  <p className="mt-3 text-lg font-black text-slate-950 dark:text-white">{currentOption.hint}</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                    QR Publish mevcut oluşturma ekranını açacak. QR türünü orada seçip slug, hedef ve tasarım ayarlarınızı tamamlayabilirsiniz.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Slug ve hedef bağlantı",
                      "QR stüdyosu ve logo",
                      "İndirme ve paylaşım",
                    ].map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.6rem] border border-dashed border-violet-300 bg-violet-50/70 p-5 dark:border-violet-400/30 dark:bg-violet-500/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-950 dark:text-white">Mevcut QR oluşturma akışını aç</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">QR builder ayrı katmanda açılır; oluşturduğunuz an sizi son adıma taşıyoruz.</p>
                    </div>
                    <Button onClick={onOpenBuilder}>
                      <QrCode size={16} />
                      İlk QR'ı oluştur
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button variant="secondary" onClick={onBack}>Geri</Button>
                  <button type="button" onClick={onLater} className="text-sm font-black text-slate-500 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    Sonra tamamla
                  </button>
                </div>
              </div>
            )}

            {step === 3 && createdQr && (
              <div className="space-y-5">
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <CheckCircle2 size={22} />
                    </span>
                    <div>
                      <p className="text-lg font-black text-slate-950 dark:text-white">İlk QR'ınız yayınlandı</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {createdQr.title} hazır. Şimdi indirin veya linkini paylaşın.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Yayın linki</p>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate rounded-2xl bg-slate-50 px-4 py-3 font-mono text-sm font-bold text-slate-600 transition hover:text-violet-700 dark:bg-white/5 dark:text-slate-200 dark:hover:text-violet-300">
                    {previewUrl}
                  </a>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Button onClick={onCopyLink} variant="secondary"><Link2 size={15} /> Linki Kopyala</Button>
                    <Button onClick={onDownloadPng}><ImageIcon size={15} /> PNG İndir</Button>
                    <Button onClick={onDownloadSvg}><QrCode size={15} /> SVG İndir</Button>
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15">
                      <ExternalLink size={15} />
                      Önizle
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button onClick={onComplete}>Kurulumu Tamamla</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

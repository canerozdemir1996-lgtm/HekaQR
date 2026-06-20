"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Link2, QrCode, Utensils } from "lucide-react";
import { TestimonialCard, type CardPosition, type QrTypeCardData } from "@/components/ui/testimonial-cards";

const testimonials: QrTypeCardData[] = [
  {
    id: 1,
    title: "Dinamik URL QR",
    audience: "Kampanya ve yönlendirme",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    accentClass: "bg-violet-500/15 text-violet-200",
    summary: "Basılı QR’ı yeniden üretmeden hedef URL, UTM, cihaz bazlı yönlendirme ve A/B testi akışlarını panelden değiştirin.",
    bullets: [
      "Kampanya bazlı yönlendirme",
      "UTM, Pixel ve GTM desteği",
      "Cihaz ve tarih bazlı kurallar",
    ],
    Icon: QrCode,
  },
  {
    id: 2,
    title: "Menu QR",
    audience: "Restoran ve masa siparişi",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
    accentClass: "bg-emerald-500/15 text-emerald-200",
    summary: "Kategori, ürün, görsel, indirim ve masa sipariş akışını mobil menü deneyimi içinde tek QR ile yönetin.",
    bullets: [
      "Masa bazlı QR üretimi",
      "Kategori ve ürün yönetimi",
      "Sipariş ve indirim akışı",
    ],
    Icon: Utensils,
  },
  {
    id: 3,
    title: "Multi URL / vCard",
    audience: "Profil ve mikro landing",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    accentClass: "bg-sky-500/15 text-sky-200",
    summary: "Kartvizit, link-in-bio ve tanıtım akışlarını markalı, mobil uyumlu bir landing sayfasında toplayın.",
    bullets: [
      "Profil ve iletişim alanı",
      "Çoklu bağlantı blokları",
      "Markalı önizleme deneyimi",
    ],
    Icon: Link2,
  },
];

export function ShuffleCards() {
  const [positions, setPositions] = useState<CardPosition[]>(["front", "middle", "back"]);

  const handleNext = useCallback(() => {
    setPositions((current) => {
      const next = [...current];
      const last = next.pop();
      if (last) next.unshift(last);
      return next as CardPosition[];
    });
  }, []);

  const handlePrev = useCallback(() => {
    setPositions((current) => {
      const next = [...current];
      const first = next.shift();
      if (first) next.push(first);
      return next as CardPosition[];
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div className="grid place-content-center overflow-visible px-3 py-8 text-slate-50 sm:px-6 lg:justify-end">
      <div className="relative h-[500px] w-[330px] sm:h-[520px] sm:w-[430px] md:w-[500px] lg:w-[560px]">
        {testimonials.map((item, index) => (
          <TestimonialCard
            key={item.id}
            item={item}
            handleShuffle={handleNext}
            position={positions[index]}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 lg:justify-end">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Önceki QR tipi"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Sonraki QR tipi"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

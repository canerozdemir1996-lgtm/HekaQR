"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";

export type CardPosition = "front" | "middle" | "back";

export type QrTypeCardData = {
  id: number;
  title: string;
  summary: string;
  audience: string;
  image: string;
  accentClass: string;
  Icon: LucideIcon;
  bullets: string[];
};

type QrTypeCardProps = {
  handleShuffle: () => void;
  item: QrTypeCardData;
  position: CardPosition;
};

function getDragClientX(event: MouseEvent | PointerEvent | TouchEvent) {
  if ("clientX" in event) return event.clientX;
  if ("touches" in event && event.touches.length > 0) return event.touches[0].clientX;
  if ("changedTouches" in event && event.changedTouches.length > 0) return event.changedTouches[0].clientX;
  return 0;
}

export function TestimonialCard({ handleShuffle, item, position }: QrTypeCardProps) {
  const dragRef = React.useRef(0);
  const isFront = position === "front";
  const Icon = item.Icon;

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? 3 : position === "middle" ? 2 : 1,
      }}
      animate={{
        rotate: position === "front" ? "-7deg" : position === "middle" ? "0deg" : "7deg",
        x: position === "front" ? "0%" : position === "middle" ? "20%" : "40%",
        y: position === "front" ? 0 : position === "middle" ? 12 : 24,
        scale: position === "front" ? 1 : position === "middle" ? 0.96 : 0.92,
        opacity: position === "front" ? 1 : 0.88,
      }}
      drag
      dragElastic={0.35}
      dragListener={isFront}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDragStart={(event) => {
        dragRef.current = getDragClientX(event);
      }}
      onDragEnd={(event) => {
        if (dragRef.current - getDragClientX(event) > 120) {
          handleShuffle();
        }
        dragRef.current = 0;
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`absolute left-0 top-0 h-[460px] w-[300px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/90 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-md sm:w-[330px] md:w-[360px] lg:w-[390px] ${
        isFront ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="relative h-[220px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/10" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/55 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${item.accentClass}`}>
            <Icon size={16} />
          </span>
          QR Tipi
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">{item.audience}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{item.title}</h3>
        </div>
      </div>

      <div className="flex h-[240px] flex-col justify-between p-6">
        <div>
          <p className="text-sm font-semibold leading-7 text-slate-300">{item.summary}</p>
          <div className="mt-5 space-y-2.5">
            {item.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-2.5">
                <div className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.accentClass}`}>
                  <Check size={13} />
                </div>
                <span className="text-sm font-semibold leading-6 text-slate-200">{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Sonraki için kaydırın</span>
          <span className="text-sm font-black text-violet-300">{isFront ? "Aktif kart" : "Sıradaki"}</span>
        </div>
      </div>
    </motion.div>
  );
}

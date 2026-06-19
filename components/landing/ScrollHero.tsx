"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  IdCard,
  type LucideIcon,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

type OrbitChipDef = {
  label: string;
  caption: string;
  icon: LucideIcon;
  points: Point[];
  duration: number;
  delay?: number;
  tone: string;
  width?: string;
};

type OrbitDotDef = {
  points: Point[];
  duration: number;
  delay?: number;
  className?: string;
};

const arcTop: Point[] = [
  { x: 142, y: 92 },
  { x: 292, y: 38 },
  { x: 520, y: 46 },
  { x: 690, y: 108 },
];

const arcRight: Point[] = [
  { x: 708, y: 132 },
  { x: 790, y: 254 },
  { x: 786, y: 410 },
  { x: 720, y: 544 },
];

const arcBottom: Point[] = [
  { x: 166, y: 564 },
  { x: 342, y: 604 },
  { x: 560, y: 596 },
  { x: 742, y: 528 },
];

const arcLeft: Point[] = [
  { x: 106, y: 170 },
  { x: 58, y: 314 },
  { x: 84, y: 466 },
  { x: 148, y: 560 },
];

const orbitChips: OrbitChipDef[] = [
  {
    label: "Menu QR",
    caption: "Siparis ve masa akisi",
    icon: ChefHat,
    points: [
      { x: 118, y: 56 },
      { x: 152, y: 42 },
      { x: 188, y: 50 },
      { x: 146, y: 68 },
    ],
    duration: 10,
    tone: "from-violet-500/16 to-violet-400/10 text-violet-700 dark:text-violet-200",
    width: "min-w-[192px]",
  },
  {
    label: "Dinamik QR",
    caption: "Kampanya ve yonlendirme",
    icon: QrCode,
    points: [
      { x: 550, y: 54 },
      { x: 590, y: 38 },
      { x: 630, y: 48 },
      { x: 582, y: 68 },
    ],
    duration: 12,
    delay: 0.8,
    tone: "from-sky-500/14 to-violet-400/10 text-slate-800 dark:text-white",
    width: "min-w-[214px]",
  },
  {
    label: "Raporlama",
    caption: "Gercek zamanli olcum",
    icon: BarChart3,
    points: [
      { x: 728, y: 202 },
      { x: 748, y: 230 },
      { x: 740, y: 260 },
      { x: 714, y: 232 },
    ],
    duration: 9,
    delay: 0.35,
    tone: "from-emerald-500/14 to-sky-400/10 text-slate-800 dark:text-white",
    width: "min-w-[188px]",
  },
  {
    label: "Wi-Fi QR",
    caption: "Tek dokunusla paylasim",
    icon: Wifi,
    points: [
      { x: 736, y: 374 },
      { x: 754, y: 404 },
      { x: 734, y: 434 },
      { x: 710, y: 404 },
    ],
    duration: 10,
    delay: 1,
    tone: "from-violet-500/14 to-sky-400/10 text-slate-800 dark:text-white",
    width: "min-w-[190px]",
  },
  {
    label: "vCard",
    caption: "Profil ve iletisim sayfasi",
    icon: IdCard,
    points: [
      { x: 82, y: 420 },
      { x: 100, y: 446 },
      { x: 88, y: 476 },
      { x: 66, y: 448 },
    ],
    duration: 11,
    delay: 0.55,
    tone: "from-fuchsia-500/14 to-violet-400/10 text-slate-800 dark:text-white",
    width: "min-w-[198px]",
  },
];

const orbitDots: OrbitDotDef[] = [
  { points: arcTop, duration: 12, className: "h-3 w-3 bg-violet-400 shadow-[0_0_28px_rgba(167,139,250,0.88)]" },
  { points: [...arcTop].reverse(), duration: 15, delay: 0.7, className: "h-2.5 w-2.5 bg-sky-300 shadow-[0_0_24px_rgba(125,211,252,0.9)]" },
  { points: arcRight, duration: 10, delay: 0.15, className: "h-3 w-3 bg-violet-500 shadow-[0_0_28px_rgba(139,92,246,0.88)]" },
  { points: arcBottom, duration: 14, delay: 1.2, className: "h-2.5 w-2.5 bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" },
  { points: arcLeft, duration: 11, delay: 0.45, className: "h-2 w-2 bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.88)]" },
];

function buildSmoothPath(points: Point[]) {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}

function PathBackdrop() {
  const paths = [
    { d: buildSmoothPath(arcTop), color: "rgba(139,92,246,0.42)", dash: "8 11" },
    { d: buildSmoothPath(arcRight), color: "rgba(125,211,252,0.34)", dash: "8 12" },
    { d: buildSmoothPath(arcBottom), color: "rgba(45,212,191,0.28)", dash: "10 14" },
    { d: buildSmoothPath(arcLeft), color: "rgba(196,181,253,0.34)", dash: "7 12" },
  ];

  return (
    <svg viewBox="0 0 860 640" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      {paths.map((path) => (
        <path
          key={path.d}
          d={path.d}
          stroke={path.color}
          strokeDasharray={path.dash}
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      ))}
      <circle cx="562" cy="548" r="138" stroke="rgba(139,92,246,0.08)" strokeWidth="1.2" />
      <circle cx="250" cy="188" r="168" stroke="rgba(196,181,253,0.12)" strokeWidth="1.2" />
    </svg>
  );
}

function OrbitChip({
  item,
  mouseX,
  mouseY,
  scrollProgress,
}: {
  item: OrbitChipDef;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
}) {
  const xShift = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  const yShift = useTransform(mouseY, [-0.5, 0.5], [-9, 9]);
  const scrollLift = useTransform(scrollProgress, [0, 1], [0, -16]);
  const Icon = item.icon;

  return (
    <motion.div className="pointer-events-none absolute inset-0 hidden lg:block" style={{ x: xShift, y: yShift }}>
      <motion.div
        className={cn(
          "absolute flex items-center gap-3 rounded-[1.6rem] border border-white/65 bg-white/88 px-4 py-3 shadow-[0_22px_52px_rgba(148,163,184,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1324]/76 dark:shadow-[0_22px_52px_rgba(2,6,23,0.32)]",
          item.width,
        )}
        style={{ y: scrollLift }}
        animate={{
          x: item.points.map((point) => point.x),
          y: item.points.map((point) => point.y),
          rotate: [0, 1, -1, 0],
          scale: [1, 1.012, 0.994, 1],
        }}
        transition={{
          duration: item.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: item.delay ?? 0,
        }}
      >
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/60 dark:ring-white/10", item.tone)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-base font-black tracking-tight text-slate-900 dark:text-white">{item.label}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {item.caption}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OrbitDot({
  item,
  mouseX,
  mouseY,
  scrollProgress,
}: {
  item: OrbitDotDef;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
}) {
  const xShift = useTransform(mouseX, [-0.5, 0.5], [-16, 16]);
  const yShift = useTransform(mouseY, [-0.5, 0.5], [-14, 14]);
  const scrollShift = useTransform(scrollProgress, [0, 1], [0, -10]);

  return (
    <motion.div className="pointer-events-none absolute inset-0" style={{ x: xShift, y: yShift }}>
      <motion.div
        className={cn("absolute rounded-full", item.className)}
        style={{ y: scrollShift }}
        animate={{
          x: item.points.map((point) => point.x),
          y: item.points.map((point) => point.y),
          opacity: [0.5, 1, 0.7, 1],
          scale: [0.9, 1.12, 0.92, 1.06],
        }}
        transition={{
          duration: item.duration,
          repeat: Infinity,
          ease: "linear",
          delay: item.delay ?? 0,
        }}
      />
    </motion.div>
  );
}

function DashboardMock({
  mouseX,
  mouseY,
  scrollProgress,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
}) {
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-4.5, 4.5]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const y = useTransform(scrollProgress, [0, 1], [0, -18]);
  const scale = useTransform(scrollProgress, [0, 1], [1.02, 0.98]);

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[760px] rounded-[2.5rem] border border-white/70 bg-white/90 p-3 shadow-[0_42px_95px_rgba(148,163,184,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1120]/84 dark:shadow-[0_42px_95px_rgba(2,6,23,0.52)]"
      style={{ rotateY, rotateX, y, scale, transformStyle: "preserve-3d" }}
    >
      <div className="grid gap-0 rounded-[1.95rem] border border-slate-200/80 bg-white text-slate-900 shadow-inner dark:border-white/10 dark:bg-[#10182c] dark:text-white lg:grid-cols-[170px_1fr]">
        <div className="border-b border-slate-200/70 p-5 dark:border-white/10 lg:border-b-0 lg:border-r">
          <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">QR Publish</div>
          <div className="mt-7 space-y-2.5">
            {["Genel Bakis", "QR Kodlar", "Tarama Istatistikleri", "Raporlar", "Kampanyalar", "Ayarlar"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold",
                  index === 0
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/14 dark:text-violet-200"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", index === 0 ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600")} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-500">Genel Bakis</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight lg:text-[2rem]">Canli QR performansi</h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              01 May - 31 May 2024
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "Toplam Tarama", value: "1.248.320", delta: "+18.3%" },
              { label: "Aktif QR Kod", value: "256", delta: "+12.7%" },
              { label: "Tarama Orani", value: "%62,4", delta: "+8.1%" },
              { label: "Olusturulan QR", value: "342", delta: "+9.5%" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.label}</p>
                <p className="mt-3 text-2xl font-black tracking-tight">{item.value}</p>
                <p className="mt-2 text-xs font-black text-emerald-500">
                  {item.delta} <span className="text-slate-400 dark:text-slate-500">Bu ay</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[1.9rem] border border-slate-200 bg-gradient-to-b from-white to-violet-50/70 p-4 dark:border-white/10 dark:from-white/[0.04] dark:to-violet-500/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Tarama Performansi</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Gunluk dalgalanma ve yukselis grafigi
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Gunluk
              </div>
            </div>

            <div className="mt-5 h-[200px] rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,243,255,0.84))] px-4 pb-4 pt-6 dark:bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_46%),linear-gradient(180deg,rgba(17,24,39,0.55),rgba(15,23,42,0.88))]">
              <svg viewBox="0 0 520 176" className="h-full w-full" fill="none" aria-hidden="true">
                <path
                  d="M 0 132 C 36 102, 60 82, 104 88 S 182 128, 230 98 S 312 54, 360 92 S 438 126, 482 66 S 504 58, 520 40"
                  stroke="url(#heroLine)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="heroLine" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#6d28d9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PhoneMock({
  mouseX,
  mouseY,
  scrollProgress,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
}) {
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-14, 14]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [11, -11]);
  const rotateZ = useTransform(mouseX, [-0.5, 0.5], [-8, 6]);
  const y = useTransform(scrollProgress, [0, 1], [0, 30]);
  const x = useTransform(mouseX, [-0.5, 0.5], [-18, 18]);
  const scale = useTransform(scrollProgress, [0, 1], [1.02, 0.94]);

  return (
    <motion.div
      className="absolute bottom-[92px] right-[12px] z-20 hidden lg:block"
      style={{ x, y, scale, rotateX, rotateY, rotateZ, transformStyle: "preserve-3d" }}
    >
      <div className="w-[258px] rounded-[2.8rem] bg-[#0b1020] p-[8px] shadow-[0_42px_82px_rgba(15,23,42,0.44)] ring-1 ring-black/10">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-white">
          <div className="absolute left-1/2 top-3 h-7 w-32 -translate-x-1/2 rounded-full bg-black" />
          <div className="bg-[linear-gradient(180deg,#0d1324_0%,#111827_100%)] px-5 pb-6 pt-10 text-white">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              <span>Hos Geldiniz</span>
              <ChefHat size={13} />
            </div>
            <h3 className="mt-3 text-[1.85rem] font-black tracking-tight">Piksel Erhan</h3>
            <p className="mt-2 text-sm font-semibold text-slate-300">Masa bazli menu ve siparis akisi</p>
          </div>
          <div className="space-y-3 bg-white p-4 text-slate-900">
            {["Ana Yemekler", "Icecekler", "Tatlilar", "Kampanyalar"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm">
                <span className="text-sm font-black">{item}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  {index === 0 ? <ChefHat size={16} /> : index === 1 ? <Wifi size={16} /> : index === 2 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
                </div>
              </div>
            ))}
            <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-600 to-indigo-500 p-4 text-white shadow-[0_18px_34px_rgba(124,58,237,0.28)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-100">QR Publish</p>
              <p className="mt-2 text-sm font-bold leading-6">Ile siparis verin, masaya gelsin.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ScrollHero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 120, damping: 22, mass: 0.4 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 120, damping: 22, mass: 0.4 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.35 });

  const textY = useTransform(smoothScroll, [0, 1], [0, 90]);
  const textOpacity = useTransform(smoothScroll, [0, 0.92], [1, 0.74]);
  const sceneScale = useTransform(smoothScroll, [0, 1], [1, 0.955]);
  const sceneY = useTransform(smoothScroll, [0, 1], [0, 62]);
  const haloScale = useTransform(smoothScroll, [0, 1], [1, 1.08]);
  const railX = useTransform(smoothMouseX, [-0.5, 0.5], [-8, 8]);
  const railY = useTransform(smoothScroll, [0, 1], [0, -16]);

  function handleMouseMove(event: ReactMouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseX.set(Math.max(-0.5, Math.min(0.5, nextX * 0.5)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, nextY * 0.5)));
  }

  function resetMouse() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMouse}
      className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-8 pt-3 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-2"
    >
      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
          <Sparkles size={16} />
          Modern QR akislari, panelden canli yonetim
        </div>

        <h1 className="max-w-[640px] text-[3.5rem] font-black leading-[0.92] tracking-tight text-slate-950 dark:text-white sm:text-[4.6rem] lg:text-[5.15rem]">
          QR kodlarinizi yayinlayin,
          <br />
          yonetin ve olcun.
          <span className="ml-2 inline-block h-3 w-3 rounded-full bg-violet-500 align-middle shadow-[0_0_22px_rgba(139,92,246,0.85)]" />
        </h1>

        <p className="mt-5 max-w-[560px] text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
          QR Publish; restoran menusu, dijital kartvizit, kampanya sayfasi, Wi-Fi ve ozel akislar icin modern QR cozumleri sunar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-7 py-4 text-sm font-black text-white shadow-[0_24px_40px_rgba(124,58,237,0.28)] transition hover:-translate-y-1 hover:from-violet-500 hover:to-indigo-500"
          >
            Ucretsiz Dene
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <ArrowRight size={18} />
            </span>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/88 px-7 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-violet-200"
          >
            Ozellikleri Incele
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="mt-10 grid max-w-[620px] gap-3 sm:grid-cols-3">
          {[
            { title: "10.000+", text: "Mutlu kullanici", icon: QrCode },
            { title: "1M+", text: "Tarama", icon: BarChart3 },
            { title: "Guvenli", text: "ve guvenilir", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-4 shadow-[0_16px_40px_rgba(148,163,184,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(2,6,23,0.2)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-lg font-black leading-none text-slate-950 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div style={{ scale: sceneScale, y: sceneY }} className="relative min-h-[560px] overflow-visible lg:min-h-[700px]">
        <motion.div
          style={{ scale: haloScale }}
          className="absolute left-[4%] top-[2%] h-[82%] w-[90%] rounded-[3rem] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_32%),radial-gradient(circle_at_90%_18%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.12),transparent_30%)] blur-2xl"
        />
        <div className="absolute right-[2%] top-[5%] h-[78%] w-[88%] rounded-[3rem] border border-white/60 bg-white/46 shadow-[0_44px_110px_rgba(168,85,247,0.09)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/[0.03]" />
        <div className="absolute left-[34%] top-[18%] h-40 w-40 rounded-full bg-violet-400/10 blur-3xl lg:h-56 lg:w-56" />
        <div
          className="absolute bottom-[182px] right-[74px] hidden h-[110px] w-[110px] opacity-70 lg:block"
          style={{ backgroundImage: "radial-gradient(circle, rgba(167,139,250,0.5) 1.4px, transparent 1.4px)", backgroundSize: "14px 14px" }}
        />

        <PathBackdrop />

        {orbitDots.map((item, index) => (
          <OrbitDot
            key={`${item.duration}-${index}`}
            item={item}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            scrollProgress={smoothScroll}
          />
        ))}

        {orbitChips.map((item) => (
          <OrbitChip
            key={item.label}
            item={item}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            scrollProgress={smoothScroll}
          />
        ))}

        <div className="relative z-10 pt-10 lg:pt-4">
          <DashboardMock mouseX={smoothMouseX} mouseY={smoothMouseY} scrollProgress={smoothScroll} />
          <PhoneMock mouseX={smoothMouseX} mouseY={smoothMouseY} scrollProgress={smoothScroll} />
        </div>

        <motion.div
          className="absolute bottom-[26px] left-[8%] right-[4%] z-30 hidden rounded-[1.65rem] border border-white/70 bg-white/86 px-4 py-3 shadow-[0_20px_46px_rgba(148,163,184,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1324]/78 lg:block"
          style={{ x: railX, y: railY }}
        >
          <div className="grid gap-3 xl:grid-cols-4">
            {[
              "Dakikalar icinde QR olusturun",
              "Dinamik icerik ile anlik guncelleyin",
              "Gercek zamanli olcumleyin",
              "Guvenli, hizli ve her yerde erisilebilir",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  {index === 0 ? <Sparkles size={16} /> : index === 1 ? <QrCode size={16} /> : index === 2 ? <BarChart3 size={16} /> : <ShieldCheck size={16} />}
                </div>
                <p className="text-xs font-black leading-5 text-slate-700 dark:text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

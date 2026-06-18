"use client";

import { useRef } from "react";
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
  type LucideIcon,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

type OrbitChipDef = {
  label: string;
  icon: LucideIcon;
  points: Array<{ x: number; y: number }>;
  duration: number;
  delay?: number;
  tone: string;
};

type OrbitDotDef = {
  points: Array<{ x: number; y: number }>;
  duration: number;
  delay?: number;
  className?: string;
};

const arcTop = [
  { x: 64, y: 180 },
  { x: 160, y: 96 },
  { x: 312, y: 44 },
  { x: 496, y: 54 },
  { x: 648, y: 112 },
  { x: 760, y: 196 },
];

const arcRight = [
  { x: 710, y: 112 },
  { x: 780, y: 204 },
  { x: 812, y: 336 },
  { x: 788, y: 474 },
  { x: 708, y: 584 },
];

const arcBottom = [
  { x: 124, y: 578 },
  { x: 274, y: 610 },
  { x: 470, y: 610 },
  { x: 660, y: 582 },
  { x: 796, y: 530 },
];

const arcLeft = [
  { x: 58, y: 206 },
  { x: 28, y: 336 },
  { x: 42, y: 466 },
  { x: 114, y: 564 },
];

const orbitChips: OrbitChipDef[] = [
  {
    label: "Menü QR",
    icon: ChefHat,
    points: [
      { x: 154, y: 82 },
      { x: 186, y: 70 },
      { x: 214, y: 76 },
      { x: 178, y: 90 },
    ],
    duration: 10,
    tone: "from-violet-500/14 to-violet-400/8 text-violet-700 dark:text-violet-200",
  },
  {
    label: "Dinamik QR",
    icon: QrCode,
    points: [
      { x: 572, y: 84 },
      { x: 606, y: 70 },
      { x: 644, y: 78 },
      { x: 604, y: 96 },
    ],
    duration: 12,
    delay: 0.8,
    tone: "from-sky-500/14 to-violet-400/10 text-slate-800 dark:text-white",
  },
  {
    label: "Raporlama",
    icon: BarChart3,
    points: [
      { x: 792, y: 210 },
      { x: 808, y: 236 },
      { x: 802, y: 272 },
      { x: 778, y: 244 },
    ],
    duration: 9,
    delay: 0.4,
    tone: "from-emerald-500/14 to-sky-400/10 text-slate-800 dark:text-white",
  },
  {
    label: "Wi-Fi QR",
    icon: Wifi,
    points: [
      { x: 804, y: 372 },
      { x: 814, y: 402 },
      { x: 796, y: 432 },
      { x: 780, y: 404 },
    ],
    duration: 10,
    delay: 1.1,
    tone: "from-violet-500/14 to-sky-400/10 text-slate-800 dark:text-white",
  },
];

const orbitDots: OrbitDotDef[] = [
  { points: arcTop, duration: 12, className: "h-3 w-3 bg-violet-400 shadow-[0_0_30px_rgba(167,139,250,0.85)]" },
  { points: [...arcTop].reverse(), duration: 14, delay: 0.8, className: "h-2.5 w-2.5 bg-sky-300 shadow-[0_0_26px_rgba(125,211,252,0.9)]" },
  { points: arcRight, duration: 10, delay: 0.2, className: "h-3 w-3 bg-violet-500 shadow-[0_0_28px_rgba(139,92,246,0.9)]" },
  { points: arcBottom, duration: 15, delay: 1.4, className: "h-2.5 w-2.5 bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.9)]" },
  { points: arcLeft, duration: 11, delay: 0.6, className: "h-2 w-2 bg-violet-300 shadow-[0_0_22px_rgba(196,181,253,0.85)]" },
];

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
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
    { d: buildSmoothPath(arcTop), color: "rgba(139,92,246,0.48)", dash: "8 10" },
    { d: buildSmoothPath(arcRight), color: "rgba(125,211,252,0.42)", dash: "7 12" },
    { d: buildSmoothPath(arcBottom), color: "rgba(45,212,191,0.34)", dash: "9 14" },
    { d: buildSmoothPath(arcLeft), color: "rgba(196,181,253,0.42)", dash: "7 11" },
  ];

  return (
    <svg
      viewBox="0 0 860 640"
      className="absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden="true"
    >
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
      <circle cx="580" cy="564" r="124" stroke="rgba(139,92,246,0.1)" strokeWidth="1.2" />
      <circle cx="246" cy="198" r="168" stroke="rgba(196,181,253,0.14)" strokeWidth="1.2" />
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
  const xShift = useTransform(mouseX, [-0.5, 0.5], [-12, 12]);
  const yShift = useTransform(mouseY, [-0.5, 0.5], [-10, 10]);
  const scrollLift = useTransform(scrollProgress, [0, 1], [0, -22]);
  const Icon = item.icon;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 hidden lg:block"
      style={{ x: xShift, y: yShift }}
    >
      <motion.div
        className={cn(
          "absolute flex min-w-[156px] items-center gap-3 rounded-[1.65rem] border border-white/60 bg-white/88 px-4 py-3 shadow-[0_18px_45px_rgba(148,163,184,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1324]/78 dark:shadow-[0_18px_45px_rgba(2,6,23,0.34)]",
        )}
        style={{ y: scrollLift }}
        animate={{
          x: item.points.map((point) => point.x),
          y: item.points.map((point) => point.y),
          rotate: [0, 1.2, -1, 0],
          scale: [1, 1.015, 0.995, 1],
        }}
        transition={{
          duration: item.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: item.delay ?? 0,
        }}
      >
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br", item.tone)}>
          <Icon size={18} />
        </div>
        <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{item.label}</span>
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
  const xShift = useTransform(mouseX, [-0.5, 0.5], [-20, 20]);
  const yShift = useTransform(mouseY, [-0.5, 0.5], [-18, 18]);
  const scrollShift = useTransform(scrollProgress, [0, 1], [0, -12]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ x: xShift, y: yShift }}
    >
      <motion.div
        className={cn("absolute rounded-full", item.className)}
        style={{ y: scrollShift }}
        animate={{
          x: item.points.map((point) => point.x),
          y: item.points.map((point) => point.y),
          opacity: [0.55, 1, 0.75, 1],
          scale: [0.9, 1.15, 0.92, 1.08],
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
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-4, 4]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const y = useTransform(scrollProgress, [0, 1], [0, -28]);
  const scale = useTransform(scrollProgress, [0, 1], [1, 0.95]);

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[660px] rounded-[2.2rem] border border-white/70 bg-white/90 p-3 shadow-[0_35px_80px_rgba(148,163,184,0.3)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1120]/84 dark:shadow-[0_35px_80px_rgba(2,6,23,0.5)]"
      style={{ rotateY, rotateX, y, scale, transformStyle: "preserve-3d" }}
    >
      <div className="grid gap-0 rounded-[1.7rem] border border-slate-200/80 bg-white text-slate-900 shadow-inner dark:border-white/10 dark:bg-[#10182c] dark:text-white lg:grid-cols-[154px_1fr]">
        <div className="border-b border-slate-200/70 p-5 dark:border-white/10 lg:border-b-0 lg:border-r">
          <BrandLogo className="w-[108px]" width={420} height={134} />
          <div className="mt-7 space-y-2.5">
            {["Genel Bakış", "QR Kodlar", "Tarama İstatistikleri", "Raporlar", "Kampanyalar", "Ayarlar"].map((item, index) => (
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
              <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-500">Genel Bakış</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">Canlı QR performansı</h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              01 May - 31 May 2024
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "Toplam Tarama", value: "1.248.320", delta: "+18.3%" },
              { label: "Aktif QR Kod", value: "256", delta: "+12.7%" },
              { label: "Tarama Oranı", value: "%62,4", delta: "+8.1%" },
              { label: "Oluşturulan QR", value: "342", delta: "+9.5%" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.label}</p>
                <p className="mt-3 text-2xl font-black tracking-tight">{item.value}</p>
                <p className="mt-2 text-xs font-black text-emerald-500">{item.delta} <span className="text-slate-400 dark:text-slate-500">Bu ay</span></p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-white to-violet-50/60 p-4 dark:border-white/10 dark:from-white/[0.04] dark:to-violet-500/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Tarama Performansı</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Günlük dalgalanma ve yükseliş grafiği</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Günlük
              </div>
            </div>

            <div className="mt-5 h-[176px] rounded-[1.4rem] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,243,255,0.84))] px-4 pb-4 pt-6 dark:bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_46%),linear-gradient(180deg,rgba(17,24,39,0.55),rgba(15,23,42,0.88))]">
              <svg viewBox="0 0 520 176" className="h-full w-full" fill="none" aria-hidden="true">
                <path
                  d="M 0 132 C 36 102, 54 82, 96 88 S 174 126, 224 96 S 304 58, 350 92 S 424 122, 470 62 S 500 54, 520 34"
                  stroke="url(#heroLine)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="heroLine" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a855f7" />
                    <stop offset="1" stopColor="#7c3aed" />
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
  const rotateZ = useTransform(mouseX, [-0.5, 0.5], [-9, 6]);
  const y = useTransform(scrollProgress, [0, 1], [0, 48]);
  const x = useTransform(mouseX, [-0.5, 0.5], [-18, 18]);
  const scale = useTransform(scrollProgress, [0, 1], [1.03, 0.9]);

  return (
    <motion.div
      className="absolute bottom-[48px] right-[52px] z-20 hidden lg:block"
      style={{ x, y, scale, rotateX, rotateY, rotateZ, transformStyle: "preserve-3d" }}
    >
      <div className="w-[250px] rounded-[2.8rem] bg-[#0b1020] p-[8px] shadow-[0_32px_70px_rgba(15,23,42,0.42)] ring-1 ring-black/10">
        <div className="relative overflow-hidden rounded-[2.35rem] bg-white">
          <div className="absolute left-1/2 top-3 h-7 w-32 -translate-x-1/2 rounded-full bg-black" />
          <div className="bg-[linear-gradient(180deg,#0d1324_0%,#111827_100%)] px-5 pb-6 pt-10 text-white">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              <span>Hoş Geldiniz</span>
              <ChefHat size={13} />
            </div>
            <h3 className="mt-3 text-[2rem] font-black tracking-tight">Piksel Erhan</h3>
            <p className="mt-2 text-sm font-semibold text-slate-300">Masa bazlı menü ve sipariş akışı</p>
          </div>
          <div className="space-y-3 bg-white p-4 text-slate-900">
            {[
              "Ana Yemekler",
              "İçecekler",
              "Tatlılar",
              "Kampanyalar",
            ].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm">
                <span className="text-sm font-black">{item}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  {index === 0 ? <ChefHat size={16} /> : index === 1 ? <Wifi size={16} /> : index === 2 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
                </div>
              </div>
            ))}
            <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-600 to-indigo-500 p-4 text-white shadow-[0_20px_35px_rgba(124,58,237,0.32)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-100">QR Publish</p>
              <p className="mt-2 text-sm font-bold leading-6">İle sipariş verin, masaya gelsin.</p>
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

  const textY = useTransform(smoothScroll, [0, 1], [0, 120]);
  const textOpacity = useTransform(smoothScroll, [0, 0.9], [1, 0.68]);
  const sceneScale = useTransform(smoothScroll, [0, 1], [1, 0.92]);
  const sceneY = useTransform(smoothScroll, [0, 1], [0, 90]);
  const haloScale = useTransform(smoothScroll, [0, 1], [1, 1.14]);
  const footerStripX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const footerStripY = useTransform(smoothScroll, [0, 1], [0, -26]);

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
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
      className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[0.94fr_1.06fr] lg:items-center"
    >
      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10">
        <div className="mb-6">
          <BrandLogo priority className="w-[212px] sm:w-[248px]" width={420} height={134} />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/72 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
          <Sparkles size={16} />
          Modern QR akışları, panelden canlı yönetim
        </div>

        <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-[5.3rem]">
          QR kodlarınızı yayınlayın,
          <br />
          yönetin ve ölçün.
          <span className="ml-2 inline-block h-3 w-3 rounded-full bg-violet-500 align-middle shadow-[0_0_22px_rgba(139,92,246,0.85)]" />
        </h1>

        <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
          QR Publish; restoran menüsü, dijital kartvizit, kampanya sayfası, Wi-Fi ve özel akışlar için modern QR çözümleri sunar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-7 py-4 text-sm font-black text-white shadow-[0_24px_40px_rgba(124,58,237,0.28)] transition hover:-translate-y-1 hover:from-violet-500 hover:to-indigo-500"
          >
            Ücretsiz Dene
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <ArrowRight size={18} />
            </span>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-violet-200 bg-white/82 px-7 py-4 text-sm font-black text-violet-700 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200"
          >
            Özellikleri İncele
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            { title: "10.000+", text: "Mutlu kullanıcı", icon: QrCode },
            { title: "1M+", text: "Tarama", icon: BarChart3 },
            { title: "Güvenli", text: "ve güvenilir", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-[1.8rem] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_45px_rgba(148,163,184,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_45px_rgba(2,6,23,0.2)]"
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

      <motion.div
        style={{ scale: sceneScale, y: sceneY }}
        className="relative min-h-[560px] overflow-visible lg:min-h-[700px]"
      >
        <motion.div
          style={{ scale: haloScale }}
          className="absolute left-[8%] top-[4%] h-[82%] w-[84%] rounded-[3rem] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.12),transparent_32%)] blur-2xl"
        />
        <div className="absolute right-[5%] top-[6%] h-[78%] w-[80%] rounded-[3.1rem] border border-white/50 bg-white/46 shadow-[0_40px_100px_rgba(168,85,247,0.08)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/[0.03]" />
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

        <div className="relative z-10 pt-20 lg:pt-14">
          <DashboardMock mouseX={smoothMouseX} mouseY={smoothMouseY} scrollProgress={smoothScroll} />
          <PhoneMock mouseX={smoothMouseX} mouseY={smoothMouseY} scrollProgress={smoothScroll} />
        </div>

        <motion.div
          className="absolute bottom-0 left-[9%] right-[4%] z-30 hidden rounded-[1.8rem] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_20px_46px_rgba(148,163,184,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1324]/80 lg:block"
          style={{ x: footerStripX, y: footerStripY }}
        >
          <div className="grid gap-3 md:grid-cols-4">
            {[
              "Dakikalar içinde QR oluşturun",
              "Dinamik içerik ile anlık güncelleyin",
              "Gerçek zamanlı ölçümleyin",
              "Güvenli, hızlı ve her yerde erişilebilir",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  {index === 0 ? <Sparkles size={17} /> : index === 1 ? <QrCode size={17} /> : index === 2 ? <BarChart3 size={17} /> : <ShieldCheck size={17} />}
                </div>
                <p className="text-sm font-black leading-6 text-slate-700 dark:text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

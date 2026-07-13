"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import LogoRenderer from "@/components/LogoRenderer";
import {
  CheckCircle2,
  Copy,
  Facebook,
  Flame,
  Instagram,
  LayoutGrid,
  Loader2,
  Twitter,
  XCircle,
  Youtube,
} from "lucide-react";

/* ---------- Tema ---------- */
type CouponTheme = {
  pageBg: string;
  cardBg: string;
  ink: string;
  muted: string;
  accent: string;
  accentText: string;
  panelBg: string;
  footerBg: string;
  panelInk: string;
  linkColor: string;
  brandLogoUrl: string;
  headline: string;
  discountLabel: string;
  validityText: string;
  claimText: string;
  ctaText: string;
  revealHint: string;
  signatureName: string;
  signatureAvatarUrl: string;
  websiteLabel: string;
  websiteUrl: string;
  footerText: string;
  socials: { facebook: string; x: string; instagram: string; youtube: string };
};

const DEFAULT_THEME: CouponTheme = {
  pageBg: "#c4a3f5",
  cardBg: "#ffffff",
  ink: "#1e1b4b",
  muted: "#64748b",
  accent: "#facc15",
  accentText: "#1e1b4b",
  panelBg: "#1e1b4b",
  footerBg: "#312e81",
  panelInk: "#c7d2fe",
  linkColor: "#bef264",
  brandLogoUrl: "",
  headline: "Sadık müşterilerimize özel",
  discountLabel: "İNDİRİM",
  validityText: "",
  claimText: "Kuponu açmak için sipariş kodunu gir",
  ctaText: "Kuponu Aç",
  revealHint: "Kuponu görmek için yırt →",
  signatureName: "",
  signatureAvatarUrl: "",
  websiteLabel: "",
  websiteUrl: "",
  footerText: "",
  socials: { facebook: "", x: "", instagram: "", youtube: "" },
};

function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function resolveTheme(raw: Record<string, unknown> | null): CouponTheme {
  const t = raw ?? {};
  const s = (t.socials ?? {}) as Record<string, unknown>;
  const pick = (k: keyof CouponTheme) => str(t[k as string], DEFAULT_THEME[k] as string);
  return {
    pageBg: pick("pageBg"),
    cardBg: pick("cardBg"),
    ink: pick("ink"),
    muted: pick("muted"),
    accent: pick("accent"),
    accentText: pick("accentText"),
    panelBg: pick("panelBg"),
    footerBg: pick("footerBg"),
    panelInk: pick("panelInk"),
    linkColor: pick("linkColor"),
    brandLogoUrl: pick("brandLogoUrl"),
    headline: pick("headline"),
    discountLabel: pick("discountLabel"),
    validityText: pick("validityText"),
    claimText: pick("claimText"),
    ctaText: pick("ctaText"),
    revealHint: pick("revealHint"),
    signatureName: pick("signatureName"),
    signatureAvatarUrl: pick("signatureAvatarUrl"),
    websiteLabel: pick("websiteLabel"),
    websiteUrl: pick("websiteUrl"),
    footerText: pick("footerText"),
    socials: {
      facebook: str(s.facebook, ""),
      x: str(s.x, ""),
      instagram: str(s.instagram, ""),
      youtube: str(s.youtube, ""),
    },
  };
}

/* ---------- Dalgalı arka plan deseni ---------- */
function WavyBg({ color }: { color: string }) {
  const lines = Array.from({ length: 22 });
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 400 760"
      fill="none"
      aria-hidden
    >
      {lines.map((_, i) => {
        const y = i * 36 - 40;
        return (
          <path
            key={i}
            d={`M-40 ${y} C 60 ${y - 34}, 140 ${y + 34}, 240 ${y} S 380 ${y - 34}, 480 ${y}`}
            stroke={color}
            strokeWidth="9"
            opacity="0.05"
          />
        );
      })}
    </svg>
  );
}

/* ---------- Yırt-göster katmanı ---------- */
function TearReveal({ theme, onRevealed }: { theme: CouponTheme; onRevealed: () => void }) {
  const [progress, setProgress] = useState(0);
  const [gone, setGone] = useState(false);
  const startX = useRef<number | null>(null);
  const width = useRef(1);
  const ref = useRef<HTMLDivElement | null>(null);

  const finish = useCallback(() => {
    if (gone) return;
    setGone(true);
    setProgress(1);
    window.setTimeout(onRevealed, 320);
  }, [gone, onRevealed]);

  const onDown = (e: React.PointerEvent) => {
    if (gone) return;
    startX.current = e.clientX;
    width.current = ref.current?.offsetWidth ?? 1;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null || gone) return;
    const dx = e.clientX - startX.current;
    setProgress(Math.max(0, Math.min(1, dx / width.current)));
  };
  const onUp = () => {
    if (startX.current === null || gone) return;
    startX.current = null;
    if (progress > 0.55) finish();
    else setProgress(0);
  };

  return (
    <div className="select-none" style={{ touchAction: "pan-y" }}>
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="flex h-12 cursor-grab items-center justify-center rounded-lg text-sm font-black uppercase tracking-[0.15em] active:cursor-grabbing"
        style={{
          background: theme.accent,
          color: theme.accentText,
          transform: `translateX(${progress * 120}%) rotate(${progress * 8}deg)`,
          opacity: gone ? 0 : 1 - progress * 0.4,
          transition: startX.current === null ? "transform .3s ease, opacity .3s ease" : "none",
        }}
      >
        {theme.revealHint}
      </div>
      {!gone && (
        <button type="button" onClick={finish} className="mt-2 w-full text-center text-xs font-bold underline" style={{ color: theme.muted }}>
          Yırtamıyor musun? Göster
        </button>
      )}
    </div>
  );
}

/* ---------- Sabit qrpublish footer (asla değişmez) ---------- */
function QrPublishFooter() {
  return (
    <div className="mt-5 flex flex-col items-center gap-1">
      <LogoRenderer className="h-7 w-36" size="sm" />
      <p className="text-[11px] font-medium text-white/70">© {new Date().getFullYear()} qrpublish</p>
    </div>
  );
}

function CouponLogo({ src, title }: { src: string; title: string }) {
  return <LogoRenderer src={src} alt={title || "Kupon logosu"} className="h-11 w-44" size="md" />;
}

/* ---------- Sosyal ---------- */
const SOCIAL_COLORS: Record<string, string> = { facebook: "#1877f2", x: "#1da1f2", instagram: "#e1306c", youtube: "#ff0000" };

/* ---------- Ana bileşen ---------- */
type Phase = "gate" | "ticket";

export default function CouponRedeemClient({
  slug,
  title,
  discount,
  description,
  validUntil,
  theme: rawTheme,
}: {
  slug: string;
  title: string;
  discount: string;
  description?: string | null;
  validUntil?: string | null;
  theme?: Record<string, unknown> | null;
}) {
  const theme = useMemo(() => resolveTheme(rawTheme ?? null), [rawTheme]);
  const [orderRef, setOrderRef] = useState("");
  const [phase, setPhase] = useState<Phase>("gate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const socials = [
    { key: "facebook", url: theme.socials.facebook, Icon: Facebook },
    { key: "x", url: theme.socials.x, Icon: Twitter },
    { key: "instagram", url: theme.socials.instagram, Icon: Instagram },
    { key: "youtube", url: theme.socials.youtube, Icon: Youtube },
  ].filter((s) => s.url);

  async function activate() {
    if (!orderRef.trim()) {
      setError("Sipariş kodu zorunlu.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/coupons/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, order_ref: orderRef.trim(), channel: "public-landing" }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok && body.code) {
        setCode(body.code);
        setPhase("ticket");
        setRevealed(false);
        return;
      }
      setError(body.message ?? "Sipariş kodu doğrulanamadı.");
    } catch {
      setError("Kupon şu anda doğrulanamıyor.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: theme.pageBg }}>
      <section className="mx-auto flex w-full max-w-md flex-col items-center">
        {/* Üst marka işareti */}
        <div className="mb-4 rounded-2xl bg-white/25 px-4 py-2 backdrop-blur">
          <CouponLogo src={theme.brandLogoUrl} title={title} />
        </div>

        {/* KART 1 — beyaz bilet */}
        <div className="coupon-ticket relative w-full overflow-hidden" style={{ background: theme.cardBg, "--coupon-page": theme.pageBg } as React.CSSProperties}>
          <WavyBg color={theme.ink} />
          <div className="relative px-8 pb-8 pt-9">
            <div className="flex justify-center">
              <Flame size={38} style={{ color: theme.accent }} />
            </div>
            <p className="mt-3 text-center text-sm font-black" style={{ color: theme.ink }}>
              {theme.headline}
            </p>
            <p className="mt-2 text-center text-7xl font-black leading-none" style={{ color: theme.ink }}>
              {discount}
            </p>
            <p className="mt-2 text-center text-3xl font-black tracking-[0.4em]" style={{ color: theme.ink }}>
              {theme.discountLabel}
            </p>
            {theme.validityText || validUntil ? (
              <p className="mt-3 text-center text-xs" style={{ color: theme.muted }}>
                {theme.validityText || `Son geçerlilik: ${new Date(validUntil as string).toLocaleDateString("tr-TR")}`}
              </p>
            ) : null}
            {description ? (
              <p className="mt-1 text-center text-xs" style={{ color: theme.muted }}>
                {description}
              </p>
            ) : null}
          </div>

          {/* Perforasyon + çentikler */}
          <div className="relative">
            <div className="coupon-perforation" />
          </div>

          {/* Alt: gate → reveal */}
          <div className="relative px-8 pb-9 pt-7">
            {phase === "gate" ? (
              <div>
                <p className="text-center text-sm leading-snug" style={{ color: theme.muted }}>
                  {theme.claimText}
                </p>
                <input
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && activate()}
                  placeholder="Sipariş kodu"
                  className="mt-3 w-full rounded-lg border-2 px-4 py-2.5 text-center text-base font-black outline-none"
                  style={{ borderColor: `${theme.ink}22`, color: theme.ink }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={activate}
                  disabled={loading}
                  className="mx-auto mt-3 flex h-11 items-center justify-center gap-2 rounded-lg px-8 text-sm font-black uppercase tracking-wider disabled:opacity-70"
                  style={{ background: theme.accent, color: theme.accentText }}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                  {theme.ctaText}
                </button>
                {error ? (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-red-600">
                    <XCircle size={16} /> {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="text-center text-sm" style={{ color: theme.muted }}>
                  İndirim kodun:
                </p>
                <div className="mx-auto mt-3 max-w-xs">
                  {revealed ? (
                    <button
                      type="button"
                      onClick={copyCode}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-lg font-black tracking-[0.15em]"
                      style={{ background: theme.accent, color: theme.accentText }}
                    >
                      {code}
                      {copied ? <CheckCircle2 size={18} /> : <Copy size={15} />}
                    </button>
                  ) : (
                    <TearReveal theme={theme} onRevealed={() => setRevealed(true)} />
                  )}
                </div>
                {revealed ? (
                  <p className="mt-2 text-center text-xs" style={{ color: theme.muted }}>
                    Kopyalamak için koda dokun.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* KART 2 — koyu imza paneli */}
        {(theme.signatureName || theme.websiteUrl) && (
          <div
            className="coupon-edge-shadow relative mt-4 w-full overflow-hidden rounded-[26px] px-8 py-8"
            style={{
              background: theme.panelBg,
              backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
              backgroundSize: "26px 26px",
            }}
          >
            {theme.signatureName ? (
              <p className="text-center text-sm leading-relaxed" style={{ color: theme.panelInk }}>
                {theme.signatureName}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col items-center">
              {theme.signatureAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.signatureAvatarUrl} alt={theme.signatureName || title} className="h-14 w-14 rounded-full object-cover ring-2 ring-white/30" />
              ) : null}
              {theme.websiteUrl ? (
                <>
                  <span className="my-3 h-8 w-px" style={{ background: `${theme.panelInk}55` }} />
                  <LayoutGrid size={26} style={{ color: theme.accent }} />
                  <a
                    href={theme.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-sm font-black lowercase"
                    style={{ color: theme.linkColor }}
                  >
                    {theme.websiteLabel || theme.websiteUrl}
                  </a>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* KART 3 — koyu sosyal footer */}
        {(socials.length > 0 || theme.footerText) && (
          <div className="mt-4 w-full rounded-[26px] px-8 py-7" style={{ background: theme.footerBg }}>
            {socials.length > 0 && (
              <div className="flex justify-center gap-4">
                {socials.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: SOCIAL_COLORS[key] }}
                  >
                    <Icon size={16} color="#fff" />
                  </a>
                ))}
              </div>
            )}
            {theme.footerText ? (
              <p className="mt-4 whitespace-pre-line text-center text-xs leading-relaxed" style={{ color: `${theme.panelInk}cc` }}>
                {theme.footerText}
              </p>
            ) : null}
          </div>
        )}

        {/* Kilitli qrpublish footer — asla değişmez */}
        <QrPublishFooter />
      </section>
    </main>
  );
}

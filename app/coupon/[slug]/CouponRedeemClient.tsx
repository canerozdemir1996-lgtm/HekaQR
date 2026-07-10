"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Copy,
  Facebook,
  Flame,
  Instagram,
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
  footerBg: string;
  footerInk: string;
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
  socials: { facebook: string; x: string; instagram: string; youtube: string };
};

const DEFAULT_THEME: CouponTheme = {
  pageBg: "#c4a3f5",
  cardBg: "#ffffff",
  ink: "#1e1b4b",
  muted: "#64748b",
  accent: "#facc15",
  accentText: "#1e1b4b",
  footerBg: "#312e81",
  footerInk: "#c7d2fe",
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
  socials: { facebook: "", x: "", instagram: "", youtube: "" },
};

function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function resolveTheme(raw: Record<string, unknown> | null): CouponTheme {
  const t = raw ?? {};
  const s = (t.socials ?? {}) as Record<string, unknown>;
  return {
    pageBg: str(t.pageBg, DEFAULT_THEME.pageBg),
    cardBg: str(t.cardBg, DEFAULT_THEME.cardBg),
    ink: str(t.ink, DEFAULT_THEME.ink),
    muted: str(t.muted, DEFAULT_THEME.muted),
    accent: str(t.accent, DEFAULT_THEME.accent),
    accentText: str(t.accentText, DEFAULT_THEME.accentText),
    footerBg: str(t.footerBg, DEFAULT_THEME.footerBg),
    footerInk: str(t.footerInk, DEFAULT_THEME.footerInk),
    brandLogoUrl: str(t.brandLogoUrl, DEFAULT_THEME.brandLogoUrl),
    headline: str(t.headline, DEFAULT_THEME.headline),
    discountLabel: str(t.discountLabel, DEFAULT_THEME.discountLabel),
    validityText: str(t.validityText, DEFAULT_THEME.validityText),
    claimText: str(t.claimText, DEFAULT_THEME.claimText),
    ctaText: str(t.ctaText, DEFAULT_THEME.ctaText),
    revealHint: str(t.revealHint, DEFAULT_THEME.revealHint),
    signatureName: str(t.signatureName, DEFAULT_THEME.signatureName),
    signatureAvatarUrl: str(t.signatureAvatarUrl, DEFAULT_THEME.signatureAvatarUrl),
    websiteLabel: str(t.websiteLabel, DEFAULT_THEME.websiteLabel),
    websiteUrl: str(t.websiteUrl, DEFAULT_THEME.websiteUrl),
    socials: {
      facebook: str(s.facebook, ""),
      x: str(s.x, ""),
      instagram: str(s.instagram, ""),
      youtube: str(s.youtube, ""),
    },
  };
}

/* ---------- Yırt-göster katmanı ---------- */
function TearReveal({ theme, onRevealed }: { theme: CouponTheme; onRevealed: () => void }) {
  const [progress, setProgress] = useState(0); // 0..1
  const [gone, setGone] = useState(false);
  const startX = useRef<number | null>(null);
  const width = useRef(1);
  const ref = useRef<HTMLDivElement | null>(null);

  const finish = useCallback(() => {
    if (gone) return;
    setGone(true);
    setProgress(1);
    // animasyon süresi sonunda kodu göster
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
    <div className="relative select-none" style={{ touchAction: "pan-y" }}>
      {/* Kapak: yırtılabilir şerit */}
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="flex h-14 cursor-grab items-center justify-center rounded-xl border-2 border-dashed active:cursor-grabbing"
        style={{
          borderColor: theme.ink,
          background: theme.accent,
          color: theme.accentText,
          transform: `translateX(${progress * 120}%) rotate(${progress * 8}deg)`,
          opacity: gone ? 0 : 1 - progress * 0.4,
          transition: startX.current === null ? "transform .3s ease, opacity .3s ease" : "none",
          fontWeight: 900,
          letterSpacing: "0.08em",
        }}
      >
        {theme.revealHint}
      </div>
      {/* Fallback: desteklenmeyen tarayıcı / dokunamayan kullanıcı */}
      {!gone && (
        <button
          type="button"
          onClick={finish}
          className="mt-2 w-full rounded-lg py-2 text-xs font-black underline"
          style={{ color: theme.muted }}
        >
          Yırtamıyor musun? Göster
        </button>
      )}
    </div>
  );
}

/* ---------- Sabit qrpublish footer (asla değişmez) ---------- */
function QrPublishFooter() {
  return (
    <div className="mt-6 flex flex-col items-center gap-1">
      <Image
        src="/brand/qr-publish-logo.svg"
        alt="qrpublish"
        width={120}
        height={26}
        priority={false}
        style={{ height: 26, width: "auto" }}
      />
      <p className="text-[11px] font-medium text-white/70">
        © {new Date().getFullYear()} qrpublish
      </p>
    </div>
  );
}

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
    { url: theme.socials.facebook, Icon: Facebook },
    { url: theme.socials.x, Icon: Twitter },
    { url: theme.socials.instagram, Icon: Instagram },
    { url: theme.socials.youtube, Icon: Youtube },
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
    <main className="min-h-screen px-4 py-10" style={{ background: theme.pageBg }}>
      <section className="mx-auto w-full max-w-md">
        {/* Bilet */}
        <div className="relative overflow-hidden rounded-[28px] p-7 shadow-2xl shadow-black/20" style={{ background: theme.cardBg }}>
          {/* Marka logosu / ikon */}
          <div className="flex justify-center">
            {theme.brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.brandLogoUrl} alt={title} style={{ maxHeight: 48, width: "auto" }} />
            ) : (
              <Flame size={40} style={{ color: theme.accent }} />
            )}
          </div>

          <p className="mt-4 text-center text-sm font-bold" style={{ color: theme.ink }}>
            {theme.headline}
          </p>

          {/* İndirim */}
          <div className="mt-2 text-center">
            <p className="text-6xl font-black leading-none" style={{ color: theme.ink }}>
              {discount}
            </p>
            <p className="mt-1 text-2xl font-black tracking-[0.35em]" style={{ color: theme.ink }}>
              {theme.discountLabel}
            </p>
            {theme.validityText ? (
              <p className="mt-2 text-xs" style={{ color: theme.muted }}>
                {theme.validityText}
              </p>
            ) : validUntil ? (
              <p className="mt-2 text-xs" style={{ color: theme.muted }}>
                Son geçerlilik: {new Date(validUntil).toLocaleDateString("tr-TR")}
              </p>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                {description}
              </p>
            ) : null}
          </div>

          {/* Perforasyon */}
          <div className="relative my-6">
            <span className="absolute -left-10 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" style={{ background: theme.pageBg }} />
            <span className="absolute -right-10 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" style={{ background: theme.pageBg }} />
            <div className="border-t-2 border-dashed" style={{ borderColor: `${theme.muted}66` }} />
          </div>

          {/* Alt bölüm: gate → ticket */}
          {phase === "gate" ? (
            <div>
              <p className="text-center text-sm" style={{ color: theme.muted }}>
                {theme.claimText}
              </p>
              <input
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && activate()}
                placeholder="Sipariş kodu"
                className="mt-3 w-full rounded-xl border-2 px-4 py-3 text-center text-base font-black outline-none"
                style={{ borderColor: `${theme.ink}22`, color: theme.ink }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={activate}
                disabled={loading}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-wide disabled:opacity-70"
                style={{ background: theme.accent, color: theme.accentText }}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
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
              <div className="mt-3">
                {revealed ? (
                  <button
                    type="button"
                    onClick={copyCode}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-xl font-black tracking-[0.15em]"
                    style={{ background: `${theme.accent}33`, color: theme.ink }}
                  >
                    {code}
                    {copied ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Copy size={16} style={{ color: theme.muted }} />}
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

          {/* İmza */}
          {theme.signatureName ? (
            <div className="mt-6 flex flex-col items-center gap-2 border-t pt-5" style={{ borderColor: `${theme.muted}22` }}>
              {theme.signatureAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.signatureAvatarUrl} alt={theme.signatureName} className="h-12 w-12 rounded-full object-cover" />
              ) : null}
              <p className="text-center text-sm font-bold" style={{ color: theme.ink }}>
                {theme.signatureName}
              </p>
            </div>
          ) : null}

          {/* Web / sosyal */}
          {(theme.websiteUrl || socials.length > 0) && (
            <div className="mt-5 flex flex-col items-center gap-3">
              {socials.length > 0 && (
                <div className="flex gap-4">
                  {socials.map(({ url, Icon }, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: theme.ink }}>
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              )}
              {theme.websiteUrl ? (
                <a href={theme.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-black underline" style={{ color: theme.ink }}>
                  {theme.websiteLabel || theme.websiteUrl}
                </a>
              ) : null}
            </div>
          )}
        </div>

        {/* Kilitli qrpublish footer — asla değişmez */}
        <QrPublishFooter />
      </section>
    </main>
  );
}

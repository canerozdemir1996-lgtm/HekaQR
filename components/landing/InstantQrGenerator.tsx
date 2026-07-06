"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, QrCode, Sparkles } from "lucide-react";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

type QrInstance = {
  append: (element: HTMLElement) => void;
  update: (options: unknown) => void;
  download: (options: unknown) => Promise<void>;
};

function buildOptions(data: string, size: number) {
  return {
    width: size,
    height: size,
    data: data || getPublicAppOrigin(),
    margin: Math.max(18, Math.round(size * 0.07)),
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { type: "rounded", color: "#16131F" },
    cornersSquareOptions: { type: "extra-rounded", color: "#7C3AED" },
    cornersDotOptions: { type: "dot", color: "#7C3AED" },
    backgroundOptions: { color: "#ffffff" },
  };
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function InstantQrGenerator() {
  const [value, setValue] = useState("https://qrpublish.com");
  const [debouncedValue, setDebouncedValue] = useState("https://qrpublish.com");
  const [downloading, setDownloading] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QrInstance | null>(null);
  const normalizedValue = useMemo(() => normalizeUrl(debouncedValue), [debouncedValue]);
  const valid = isValidUrl(normalizedValue);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !mountRef.current) return;
      const options = buildOptions(valid ? normalizedValue : getPublicAppOrigin(), 230);
      if (!qrRef.current) {
        mountRef.current.innerHTML = "";
        const instance = new QRCodeStyling(options as never) as unknown as QrInstance;
        instance.append(mountRef.current);
        qrRef.current = instance;
      } else {
        qrRef.current.update(options);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedValue, valid]);

  const download = async () => {
    if (!valid) return;
    setDownloading(true);
    try {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const qr = new QRCodeStyling(buildOptions(normalizedValue, 1024) as never) as unknown as Pick<QrInstance, "download">;
      await qr.download({ name: "qr-publish", extension: "png" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="bg-[linear-gradient(180deg,rgba(244,238,255,0.75),rgba(255,255,255,0.98)_72%)] px-4 py-16 dark:bg-[linear-gradient(180deg,rgba(22,17,38,0.9),rgba(5,7,19,0.98)_72%)] sm:px-6 md:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.5rem] border border-violet-100 bg-white/92 p-6 shadow-[0_28px_80px_rgba(124,58,237,0.10)] dark:border-violet-500/15 dark:bg-white/[0.04] dark:shadow-black/25 md:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-black text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
            <Sparkles size={14} /> Hesap açmadan dene
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Anında, ücretsiz QR kod oluşturun.</h2>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">
            Bir bağlantı girin, QR kodunuzu görün ve PNG olarak indirin; kayıt olmadan. Dinamik yönlendirme, tarama raporu, logo ve tasarım şablonları gibi gelişmiş özellikler için ücretsiz hesap açmanız yeterli.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="instant-qr-url" className="sr-only">
              QR kodu için bağlantı
            </label>
            <input
              id="instant-qr-url"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setValue((current) => normalizeUrl(current))}
              placeholder="https://siteniz.com"
              aria-label="QR kodu için bağlantı"
              aria-invalid={!valid}
              aria-describedby={!valid ? "instant-qr-error" : undefined}
              className="h-14 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-violet-500/10"
            />
            <button
              type="button"
              onClick={download}
              disabled={downloading || !valid}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-violet-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              PNG İndir
            </button>
          </div>
          {!valid && (
            <p id="instant-qr-error" className="mt-2 text-xs font-bold text-red-600">
              Geçerli bir bağlantı girin.
            </p>
          )}
          <p className="mt-4 text-xs font-bold text-slate-400 dark:text-slate-500">
            Bu hızlı QR statiktir; içeriği değiştirmek için yeniden oluşturmanız gerekir.{" "}
            <Link href="/signup" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-300">
              Dinamik QR için ücretsiz kayıt olun →
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-violet-100 bg-[linear-gradient(160deg,#faf8fe,#f2eefb)] p-6 dark:border-white/10 dark:bg-slate-950/40">
          <div
            className={`flex h-[230px] w-[230px] items-center justify-center overflow-hidden rounded-[1.6rem] border border-violet-100 bg-white p-3 shadow-[0_18px_40px_rgba(124,58,237,0.10)] transition-opacity dark:border-white/10 ${valid ? "opacity-100" : "opacity-40"}`}
            ref={mountRef}
            role="img"
            aria-label="Oluşturulan QR kod önizlemesi"
          >
            {!value && <QrCode className="text-slate-300" size={48} />}
          </div>
          <p className="text-center text-xs font-bold text-slate-400">Canlı önizleme</p>
        </div>
      </div>
    </section>
  );
}

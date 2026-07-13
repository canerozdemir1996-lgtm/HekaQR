"use client";

import { useState } from "react";
import Link from "next/link";

const CHROME_DOWNLOAD_PATH = "/downloads/qr-publish-chrome-extension-v1.1.0.zip";
const OPERA_DOWNLOAD_PATH = "/downloads/qr-publish-opera-extension-v1.1.0.zip";
const CHROME_EXTENSIONS_URL = "chrome://extensions/";

const STEPS = [
  { n: 1, text: 'ZIP dosyasını bilgisayarına indir.' },
  { n: 2, text: 'ZIP dosyasını bir klasöre çıkar. (Sıkıştırılmış halde yükleme çalışmaz!)' },
  {
    n: 3,
    text: "Chrome'da şu adresi aç:",
    code: CHROME_EXTENSIONS_URL,
    copyable: true,
  },
  { n: 4, text: 'Sağ üstten "Geliştirici modu" (Developer mode) geçiş düğmesini aç.' },
  { n: 5, text: '"Paketlenmemiş öğe yükle" (Load unpacked) butonuna tıkla.' },
  { n: 6, text: "ZIP'ten çıkardığın klasörü seç (manifest.json'un bulunduğu klasör)." },
  { n: 7, text: 'QR Publish Extension artık Chrome\'da aktif hale gelir.' },
  { n: 8, text: 'İstersen uzantılar simgesinden ( 🧩 ) sabitleyebilirsin.' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="ml-2 inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {copied ? "✓ Kopyalandı" : "Kopyala"}
    </button>
  );
}

function DownloadButton({ browser, className }: { browser: "Chrome" | "Opera"; className?: string }) {
  const downloadPath = browser === "Chrome" ? CHROME_DOWNLOAD_PATH : OPERA_DOWNLOAD_PATH;
  return (
    <Link
      href={downloadPath}
      download
      className={`inline-flex items-center gap-2.5 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-500 hover:shadow-violet-500/40 active:scale-95 ${className ?? ""}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Demo Extension'ı İndir
      <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-black">Demo v1 · 14 KB</span>
    </Link>
  );
}

export function ExtensionInstallGuide() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Demo Sürüm
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          QR Publish Chrome Extension Kurulumu
        </h1>
        <p className="max-w-xl text-base text-slate-500 dark:text-slate-400">
          Herhangi bir sayfayı veya bağlantıyı sağ tıklayarak saniyeler içinde QR koduna çevirin.
          Tarayıcı uzantısı henüz Chrome Web Store&apos;da yayınlanmadı; şimdilik demo sürüm olarak
          manuel kurulum yapılabilir.
        </p>
      </div>

      {/* Section A — Download */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-black text-slate-900 dark:text-white">A) Demo Sürümü İndir</h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Bu sürüm Chrome Web Store&apos;da yayınlanmadan önce test amaçlı demo pakettir.
        </p>
        <div className="flex flex-wrap gap-3">
          <DownloadButton browser="Chrome" />
          <DownloadButton browser="Opera" />
        </div>
      </section>

      {/* Section B — Steps */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-6 text-lg font-black text-slate-900 dark:text-white">
          B) Chrome&apos;da Geliştirici Modda Yükleme
        </h2>

        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                {step.n}
              </span>
              <div className="pt-0.5">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.text}</span>
                {step.code && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                      {step.code}
                    </code>
                    {step.copyable && <CopyButton text={step.code} />}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section C — Warnings */}
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-500/25 dark:bg-amber-500/[0.07]">
        <h2 className="mb-4 text-lg font-black text-amber-900 dark:text-amber-200">C) Dikkat Edilmesi Gerekenler</h2>
        <ul className="space-y-2">
          {[
            "ZIP'i silersen veya klasörün yerini değiştirirsen extension çalışmayabilir.",
            "Demo sürüm olduğu için Chrome kırmızı bir uyarı gösterebilir; bu normaldir.",
            "Yayın sürümünde Chrome Web Store bağlantısı ayrıca eklenecektir.",
            "Sadece QR Publish hesabınla kullanılması amaçlanmıştır.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <span className="mt-1 shrink-0 text-amber-500">•</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Section D — Update */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-black text-slate-900 dark:text-white">D) Güncelleme Nasıl Yapılır?</h2>
        <ol className="space-y-2">
          {[
            "Yeni ZIP'i indir.",
            "Eski extension'ı Chrome Extensions sayfasından kaldır.",
            "Yeni ZIP'i çıkarıp tekrar \"Paketlenmemiş öğe yükle\" ile ekle.",
          ].map((item, i) => (
            <li key={item} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-slate-400">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>

        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-white/10">
          <div className="flex flex-wrap gap-3">
            <DownloadButton browser="Chrome" className="text-sm" />
            <DownloadButton browser="Opera" className="text-sm" />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-8 text-center dark:border-violet-500/20 dark:from-violet-500/[0.08] dark:to-indigo-500/[0.05]">
        <p className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
          Extension kurulduktan sonra QR Publish hesabınla kullanmaya başlayabilirsin.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
        >
          Dashboard&apos;a Git →
        </Link>
      </div>
    </div>
  );
}

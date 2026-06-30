"use client";

import Link from "next/link";

const DOWNLOAD_PATH = "/downloads/qr-publish-chrome-extension-demo-v1.zip";

export function ChromeExtensionPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-violet-100/60 blur-3xl dark:bg-violet-500/10" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Puzzle icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
              <line x1="16" y1="8" x2="2" y2="22"/>
              <line x1="17" y1="15" x2="9" y2="7"/>
            </svg>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Chrome Extension</h3>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                Demo v1
              </span>
            </div>
            <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Herhangi bir sayfayı sağ tıklayarak saniyeler içinde QR koduna çevir. Geliştirici modda kurulum ile hemen kullanmaya başla.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/chrome-extension"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Kurulum Rehberi
          </Link>
          <Link
            href={DOWNLOAD_PATH}
            download
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Demo Extension'ı İndir
          </Link>
        </div>
      </div>
    </div>
  );
}

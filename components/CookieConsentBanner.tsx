"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "qrpublish_cookie_pref_v1";

type CookieChoice = "accepted" | "necessary";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setVisible(!stored);
    } catch {
      setVisible(true);
    }
  }, []);

  function saveChoice(choice: CookieChoice) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, savedAt: new Date().toISOString() }),
      );
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-[140] px-3 sm:bottom-5 sm:px-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-300/40 backdrop-blur-2xl dark:border-white/10 dark:bg-[#020617]/95 dark:shadow-black/30 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Çerez Tercihi</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
            QR Publish, oturum ve güvenlik için zorunlu çerezler kullanır. Analitik ve deneyim iyileştirme amaçlı çerezler için onayınızı isteyebiliriz.
            <Link href="/cookie-policy" className="ml-1 font-black text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200">
              Detayları inceleyin
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveChoice("necessary")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Sadece Gerekli
          </button>
          <button
            type="button"
            onClick={() => saveChoice("accepted")}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-500"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}

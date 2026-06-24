"use client";

import { useEffect, useMemo, useState } from "react";

export type PublicLocale = "tr" | "en";

const STORAGE_KEY = "qrpublish_public_locale_v1";

export function resolveInitialPublicLocale() {
  if (typeof window === "undefined") return "tr" as PublicLocale;

  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang === "tr" || queryLang === "en") return queryLang;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "tr" || stored === "en") return stored;
  } catch {
    // ignore
  }

  return window.navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function usePublicLocale() {
  const [locale, setLocale] = useState<PublicLocale>("tr");

  useEffect(() => {
    setLocale(resolveInitialPublicLocale());
  }, []);

  const updateLocale = useMemo(() => {
    return (value: PublicLocale) => {
      setLocale(value);
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore
      }
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      window.history.replaceState({}, "", url.toString());
    };
  }, []);

  return { locale, setLocale: updateLocale };
}

export default function PublicLocaleSwitcher({
  locale,
  onChange,
  className = "",
}: {
  locale: PublicLocale;
  onChange: (locale: PublicLocale) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/85 p-1 text-xs font-black shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 ${className}`}>
      {(["tr", "en"] as PublicLocale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-full px-3 py-1.5 transition ${
            locale === item
              ? "bg-violet-600 text-white"
              : "text-slate-500 hover:text-violet-700 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

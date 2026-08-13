"use client";

import { PUBLIC_LOCALE_COOKIE, type PublicLocale } from "@/lib/public-locale";

const STORAGE_KEY = "qrpublish_public_locale_v1";

export function resolveInitialPublicLocale(): PublicLocale {
  if (typeof window === "undefined") return "tr" as PublicLocale;

  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang === "tr" || queryLang === "en") return queryLang;

  const cookieLocale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PUBLIC_LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (cookieLocale === "tr" || cookieLocale === "en") return cookieLocale;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "tr" || stored === "en") return stored;
  } catch {
    // ignore
  }

  return window.navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function persistPublicLocale(locale: PublicLocale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable in private browsing. The cookie and URL still apply.
  }

  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${PUBLIC_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // Cookies may be blocked. The URL still carries the explicit locale.
  }
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
    <div
      role="group"
      aria-label="Dil seçimi / Language selection"
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 text-xs font-black shadow-sm backdrop-blur dark:border-white/15 dark:bg-slate-950/75 ${className}`}
    >
      {(["tr", "en"] as PublicLocale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-label={item === "tr" ? "Türkçe göster" : "Show in English"}
          aria-pressed={locale === item}
          className={`min-h-10 min-w-10 rounded-full px-3 py-1.5 transition ${
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

"use client";

import { useEffect } from "react";
import PublicLocaleSwitcher, { usePublicLocale } from "@/components/public/PublicLocaleSwitcher";
import type { PublicLocale } from "@/lib/public-locale";

export default function PublicLocaleToggle({
  initialLocale,
  className = "",
}: {
  initialLocale: PublicLocale;
  className?: string;
}) {
  const { locale, setLocale } = usePublicLocale();

  useEffect(() => {
    if (locale !== initialLocale) {
      setLocale(initialLocale);
    }
  }, [initialLocale, locale, setLocale]);

  return <PublicLocaleSwitcher locale={locale} onChange={setLocale} className={className} />;
}

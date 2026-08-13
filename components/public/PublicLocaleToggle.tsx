"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import PublicLocaleSwitcher, {
  persistPublicLocale,
  resolveInitialPublicLocale,
} from "@/components/public/PublicLocaleSwitcher";
import type { PublicLocale } from "@/lib/public-locale";

export default function PublicLocaleToggle({
  initialLocale,
  className = "",
}: {
  initialLocale: PublicLocale;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const explicitLocale = query.get("lang");
    if (explicitLocale === "tr" || explicitLocale === "en") return;

    const persistedLocale = resolveInitialPublicLocale();
    if (persistedLocale === initialLocale) return;

    persistPublicLocale(persistedLocale);
    query.set("lang", persistedLocale);
    const search = query.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}${window.location.hash}`, { scroll: false });
  }, [initialLocale, pathname, router]);

  const changeLocale = useCallback((nextLocale: PublicLocale) => {
    persistPublicLocale(nextLocale);
    if (nextLocale === initialLocale) return;
    const query = new URLSearchParams(window.location.search);
    query.set("lang", nextLocale);
    router.replace(`${pathname}?${query.toString()}${window.location.hash}`, { scroll: false });
  }, [initialLocale, pathname, router]);

  return <PublicLocaleSwitcher locale={initialLocale} onChange={changeLocale} className={className} />;
}

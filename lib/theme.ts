// lib/theme.ts — Global tema yönetimi (localStorage tabanlı)
import { useState, useEffect, useCallback } from "react";
import { LEGACY_THEME_STORAGE_KEYS, THEME_STORAGE_KEY } from "@/lib/brand";

export type Theme = "light" | "dark";
const DEFAULT: Theme = "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT;
  const current = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (current === "light" || current === "dark") return current;
  for (const legacyKey of LEGACY_THEME_STORAGE_KEYS) {
    const legacy = localStorage.getItem(legacyKey) as Theme | null;
    if (legacy === "light" || legacy === "dark") {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
      return legacy;
    }
  }
  return DEFAULT;
}

export function setStoredTheme(t: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, t);
  // HTML class'ını güncelle (Tailwind dark mode için)
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.setAttribute("data-theme", t);
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(DEFAULT);

  useEffect(() => {
    const stored = getStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Theme is intentionally hydrated from browser-only storage after mount.
    setTheme(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      setStoredTheme(next);
      return next;
    });
  }, []);

  return [theme, toggle];
}

// lib/theme.ts — Global tema yönetimi (localStorage tabanlı)
import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";
const KEY = "qrhub-theme";
const DEFAULT: Theme = "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT;
  return (localStorage.getItem(KEY) as Theme) || DEFAULT;
}

export function setStoredTheme(t: Theme) {
  localStorage.setItem(KEY, t);
  // HTML class'ını güncelle (Tailwind dark mode için)
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.setAttribute("data-theme", t);
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(DEFAULT);

  useEffect(() => {
    const stored = getStoredTheme();
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

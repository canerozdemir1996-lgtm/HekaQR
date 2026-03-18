"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type BigAlertItem = {
  id: string;
  title?: string;
  message: string;
  timeoutMs: number;
};

type BigAlertApi = {
  show: (t: Omit<BigAlertItem, "id">) => void;
  warn: (message: string, title?: string) => void;
};

const BigAlertCtx = createContext<BigAlertApi | null>(null);

function rid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function BigAlertProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<BigAlertItem | null>(null);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setItem(null);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const show = useCallback((t: Omit<BigAlertItem, "id">) => {
    const id = rid();
    setItem({ id, ...t });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(dismiss, t.timeoutMs ?? 8000);
  }, [dismiss]);

  const api = useMemo<BigAlertApi>(() => ({
    show,
    warn: (message, title) => show({ message, title, timeoutMs: 9000 }),
  }), [show]);

  return (
    <BigAlertCtx.Provider value={api}>
      {children}
      {item && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" role="alert" aria-live="assertive">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onMouseDown={dismiss} />
          <div
            key={item.id}
            className="relative w-full max-w-2xl rounded-3xl border border-red-500/30 bg-[#0b0c12]/95 shadow-2xl px-7 py-6 animate-scalein"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5"
              title="Kapat"
            >
              ×
            </button>
            <div className="flex items-start gap-4">
              <div className="mt-1 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.65)] animate-pulse" />
              <div className="min-w-0">
                <p className="text-[11px] font-black tracking-[0.24em] text-red-300/90 uppercase">
                  {item.title || "İKAZ"}
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-white leading-tight animate-blink">
                  {item.message}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Kapatmak için tıklayın veya Esc’ye basın.
                </p>
              </div>
            </div>
          </div>
          <BigAlertEscape onEscape={dismiss} />
        </div>
      )}
    </BigAlertCtx.Provider>
  );
}

function BigAlertEscape({ onEscape }: { onEscape: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape]);
  return null;
}

export function useBigAlert() {
  const ctx = useContext(BigAlertCtx);
  if (!ctx) throw new Error("useBigAlert must be used within BigAlertProvider");
  return ctx;
}


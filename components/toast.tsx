"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/utils/htmlSanitizer";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timeoutMs: number;
  html?: boolean;
};

type ToastApi = {
  show: (t: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string, opts?: { html?: boolean }) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

function rid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems(p => p.filter(x => x.id !== id));
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const show = useCallback((t: Omit<ToastItem, "id">) => {
    const id = rid();
    const item: ToastItem = { id, ...t };
    setItems(p => [item, ...p].slice(0, 4));
    const to = window.setTimeout(() => dismiss(id), t.timeoutMs ?? 3500);
    timers.current.set(id, to);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (message, title) => show({ type: "success", message, title, timeoutMs: 3200 }),
    error: (message, title) => show({ type: "error", message, title, timeoutMs: 5200 }),
    info: (message, title, opts) => show({ type: "info", message, title, timeoutMs: 3500, html: opts?.html }),
  }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[99999] w-[340px] max-w-[calc(100vw-2rem)] space-y-2">
        {items.map(it => {
          const palette =
            it.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : it.type === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-200"
                : "border-white/10 bg-white/[0.06] text-slate-200";
          const dot =
            it.type === "success" ? "bg-emerald-400" : it.type === "error" ? "bg-red-400" : "bg-violet-400";
          return (
            <div key={it.id}
              className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-2xl animate-scalein ${palette}`}
              role="status"
              onMouseDown={() => dismiss(it.id)}
              title="Kapatmak için tıkla"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full ${dot}`} />
                <div className="min-w-0">
                  {it.title && <p className="text-xs font-black tracking-wide">{it.title}</p>}
                  {it.html ? (
                    <p className="text-sm leading-relaxed opacity-95" dangerouslySetInnerHTML={{ __html: sanitizeHtml(it.message) }} />
                  ) : (
                    <p className="text-sm leading-relaxed opacity-95">{it.message}</p>
                  )}
                </div>
                <button className="ml-auto text-xs opacity-70 hover:opacity-100">×</button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


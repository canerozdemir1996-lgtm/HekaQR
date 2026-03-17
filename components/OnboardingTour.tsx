"use client";

import React, { useEffect, useMemo, useState } from "react";

type Step = {
  key: string;
  title: string;
  desc: string;
  selector: string;
  placement?: "top" | "bottom" | "right" | "left";
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function OnboardingTour({
  storageKey = "hekaqr_tour_done_v1",
  steps,
  isDark,
}: {
  storageKey?: string;
  steps: Step[];
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(storageKey) === "1";
      if (!done) setOpen(true);
    } catch { /* ignore */ }
  }, [storageKey]);

  const rect = useMemo(() => {
    if (!open || !step) return null;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
      bottom: r.bottom + window.scrollY,
      right: r.right + window.scrollX,
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setIdx(i => i);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [open]);

  if (!open || !step) return null;

  const finish = () => {
    try { window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  const pad = 10;
  const hl = rect
    ? {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    }
    : null;

  const w = 340;
  const h = 150;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const tip = (() => {
    if (!rect) return { top: 90, left: 90 };
    const placement = step.placement ?? "bottom";
    let top = rect.bottom + 14;
    let left = rect.left;
    if (placement === "top") top = rect.top - h - 14;
    if (placement === "right") { top = rect.top; left = rect.right + 14; }
    if (placement === "left") { top = rect.top; left = rect.left - w - 14; }
    // keep in viewport
    top = clamp(top - window.scrollY, 16, vh - h - 16) + window.scrollY;
    left = clamp(left - window.scrollX, 16, vw - w - 16) + window.scrollX;
    return { top, left };
  })();

  return (
    <div className="fixed inset-0 z-[99990]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fadein" onMouseDown={finish} />
      {hl && (
        <div
          className={`absolute rounded-3xl border pointer-events-none animate-scalein ${isDark ? "border-violet-400/60" : "border-violet-500/50"}`}
          style={{
            top: hl.top,
            left: hl.left,
            width: hl.width,
            height: hl.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35), 0 18px 60px rgba(0,0,0,0.35)",
          }}
        />
      )}

      <div
        className={`absolute w-[340px] rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl animate-scalein ${
          isDark ? "bg-[#0f1627]/95 border-white/10 text-slate-100" : "bg-white/95 border-slate-200 text-slate-900"
        }`}
        style={{ top: tip.top, left: tip.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className={`text-[10px] font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          TUR · {idx + 1}/{steps.length}
        </p>
        <h3 className="text-sm font-black mt-1">{step.title}</h3>
        <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{step.desc}</p>

        <div className="mt-3 flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            onClick={finish}
          >
            Kapat
          </button>
          <button
            className={`ml-auto px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            disabled={idx === 0}
            onClick={() => setIdx(i => Math.max(0, i - 1))}
          >
            Geri
          </button>
          <button
            className="px-3 py-2 rounded-xl text-xs font-bold text-white btn-premium focus-premium"
            onClick={() => {
              if (idx >= steps.length - 1) finish();
              else setIdx(i => i + 1);
            }}
          >
            {idx >= steps.length - 1 ? "Bitir" : "İleri"}
          </button>
        </div>
      </div>
    </div>
  );
}


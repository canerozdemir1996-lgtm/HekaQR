"use client";

import { Children, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type HorizontalScrollerProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  fadeClassName?: string;
  ariaLabel?: string;
  showArrows?: boolean;
  itemClassName?: string;
  scrollPadding?: "sm" | "md" | "lg";
};

const paddingClass: Record<NonNullable<HorizontalScrollerProps["scrollPadding"]>, string> = {
  sm: "px-3",
  md: "px-4",
  lg: "px-5",
};

const HorizontalScroller = forwardRef<HTMLDivElement, HorizontalScrollerProps>(function HorizontalScroller(
  {
    children,
    className,
    viewportClassName,
    contentClassName,
    fadeClassName = "from-white dark:from-slate-950",
    ariaLabel,
    showArrows = true,
    itemClassName,
    scrollPadding = "md",
  },
  ref,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const update = useCallback(() => {
    const node = localRef.current;
    if (!node) return;
    const max = Math.max(0, node.scrollWidth - node.clientWidth);
    setCanLeft(node.scrollLeft > 2);
    setCanRight(node.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      resizeObserver.disconnect();
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const scroll = useCallback((direction: -1 | 1) => {
    const node = localRef.current;
    if (!node) return;
    const distance = Math.max(240, Math.floor(node.clientWidth * 0.85));
    node.scrollBy({ left: direction * distance, behavior: "smooth" });
  }, []);

  return (
    <div className={cn("horizontal-scroller relative min-w-0", className)}>
      {showArrows && canLeft ? (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Sola kaydır"
          className="absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-200 md:flex"
        >
          <ChevronLeft size={16} />
        </button>
      ) : null}

      <div
        ref={localRef}
        aria-label={ariaLabel}
        onWheel={(event) => {
          const node = event.currentTarget;
          const max = node.scrollWidth - node.clientWidth;
          if (max <= 0) return;
          const delta = event.shiftKey ? event.deltaY || event.deltaX : Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
          if (!delta) return;
          const next = node.scrollLeft + delta;
          if ((delta < 0 && node.scrollLeft <= 0) || (delta > 0 && node.scrollLeft >= max)) return;
          event.preventDefault();
          node.scrollLeft = Math.max(0, Math.min(max, next));
        }}
        className={cn(
          "horizontal-scroller-viewport min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain touch-pan-x",
          paddingClass[scrollPadding],
          viewportClassName,
        )}
      >
        <div className={cn("flex w-max min-w-full flex-nowrap items-stretch gap-3 py-1", contentClassName)}>
          {Children.map(children, (child) => (
            <div className={cn("horizontal-scroller-item min-w-0 flex-none", itemClassName)}>{child}</div>
          ))}
        </div>
      </div>

      {canLeft ? <div className={cn("pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r to-transparent md:block", fadeClassName)} /> : null}
      {canRight ? <div className={cn("pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l to-transparent md:block", fadeClassName)} /> : null}

      {showArrows && canRight ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Sağa kaydır"
          className="absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-200 md:flex"
        >
          <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
});

export default HorizontalScroller;

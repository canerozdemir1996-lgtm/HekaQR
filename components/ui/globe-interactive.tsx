"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";

export interface InteractiveMarker {
  id: string;
  location: [number, number];
  name: string;
  users: number;
}

export interface GlobeInteractiveProps {
  markers?: InteractiveMarker[];
  className?: string;
  speed?: number;
  isDark?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
}

const defaultMarkers: InteractiveMarker[] = [
  { id: "hq", location: [37.78, -122.44], name: "HQ", users: 1420 },
  { id: "eu", location: [52.52, 13.41], name: "EU", users: 892 },
  { id: "asia", location: [35.68, 139.65], name: "Asia", users: 2103 },
  { id: "latam", location: [-23.55, -46.63], name: "LATAM", users: 567 },
  { id: "mena", location: [25.2, 55.27], name: "MENA", users: 734 },
  { id: "oceania", location: [-33.87, 151.21], name: "APAC", users: 445 },
];

export function GlobeInteractive({
  markers = defaultMarkers,
  className = "",
  speed = 0.003,
  isDark = true,
  selected,
  onSelect,
}: GlobeInteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const didDrag = useRef(false);
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);

  const expanded = selected !== undefined ? selected : internalExpanded;
  const setExpanded = useCallback(
    (id: string | null) => {
      if (onSelect) onSelect(id);
      else setInternalExpanded(id);
    },
    [onSelect]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const dx = e.clientX - pointerInteracting.current.x;
        const dy = e.clientY - pointerInteracting.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
        dragOffset.current = { phi: dx / 300, theta: dy / 1000 };
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;
    let ro: ResizeObserver | null = null;
    // Guards against React StrictMode's dev-only double effect invocation,
    // which would otherwise spin up two competing render loops on the same
    // canvas/WebGL context and corrupt the output.
    let cancelled = false;

    const maxUsers = Math.max(1, ...markers.map((m) => m.users));
    const baseColor: [number, number, number] = isDark ? [0.1, 0.09, 0.22] : [1, 1, 1];
    const markerColor: [number, number, number] = [0.545, 0.361, 0.965];
    const glowColor: [number, number, number] = isDark ? [0.42, 0.32, 0.78] : [0.8, 0.75, 0.98];

    function init() {
      if (cancelled) return;
      const width = canvas.offsetWidth;
      if (width === 0) return;
      if (globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: isDark ? 1 : 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: isDark ? 7 : 10,
        baseColor,
        markerColor,
        glowColor,
        markerElevation: 0,
        markers: markers.map((m) => ({
          location: m.location,
          size: 0.04 + (m.users / maxUsers) * 0.06,
          id: m.id,
        })),
        arcs: [],
        arcColor: [0.15, 0.3, 0.55],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.85,
      });

      function animate() {
        if (cancelled) return;
        if (!isPausedRef.current) phi += speed;
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => canvas && (canvas.style.opacity = "1"));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro?.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      cancelled = true;
      if (animationId) cancelAnimationFrame(animationId);
      ro?.disconnect();
      globe?.destroy();
      globe = null;
    };
  }, [markers, speed, isDark]);

  return (
    <div className={cn("relative aspect-square select-none", className)}>
      <style>{`
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 0.8; transform: translateY(0); }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onClick={() => {
          // no-op: selection happens via marker label clicks
        }}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {markers.map((m) => (
        <div
          key={m.id}
          onClick={() => {
            if (didDrag.current) return;
            setExpanded(expanded === m.id ? null : m.id);
          }}
          className={cn(
            "absolute flex flex-col items-center rounded-xl shadow-lg cursor-pointer transition-[opacity,filter,transform,padding] duration-200",
            expanded === m.id
              ? "bg-violet-600 text-white px-3 py-1.5"
              : "bg-slate-900/90 text-white px-2.5 py-1.5 hover:bg-violet-600/90"
          )}
          style={{
            positionAnchor: `--cobe-${m.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 0",
            marginBottom: 6,
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
          }}
        >
          <span className="font-mono text-[10px] font-black tracking-wider uppercase">
            {m.name}
          </span>
          {expanded === m.id && (
            <span
              className="mt-0.5 text-[10px] opacity-90"
              style={{ animation: "fade-slide-in 0.2s ease-out" }}
            >
              {m.users.toLocaleString()} üye
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

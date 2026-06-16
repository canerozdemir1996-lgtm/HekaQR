"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import createGlobe, { type Marker } from "cobe";
import { useTheme } from "@/lib/theme";

export interface CountryGeoEntry {
  code: string;
  member_count: number;
  scan_count: number;
  top_members: { id: string; email: string; full_name: string }[];
}

// Approximate lat/lng centroids for countries we actually see scan traffic from.
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  TR: { lat: 38.96, lng: 35.24, name: "Türkiye" },
  US: { lat: 39.83, lng: -98.58, name: "Amerika Birleşik Devletleri" },
  GB: { lat: 55.38, lng: -3.44, name: "Birleşik Krallık" },
  DE: { lat: 51.17, lng: 10.45, name: "Almanya" },
  FR: { lat: 46.23, lng: 2.21, name: "Fransa" },
  NL: { lat: 52.13, lng: 5.29, name: "Hollanda" },
  BG: { lat: 42.73, lng: 25.49, name: "Bulgaristan" },
  GR: { lat: 39.07, lng: 21.82, name: "Yunanistan" },
  IT: { lat: 41.87, lng: 12.57, name: "İtalya" },
  ES: { lat: 40.46, lng: -3.75, name: "İspanya" },
  PT: { lat: 39.4, lng: -8.22, name: "Portekiz" },
  PL: { lat: 51.92, lng: 19.15, name: "Polonya" },
  RO: { lat: 45.94, lng: 24.97, name: "Romanya" },
  UA: { lat: 48.38, lng: 31.17, name: "Ukrayna" },
  RU: { lat: 61.52, lng: 105.32, name: "Rusya" },
  SE: { lat: 60.13, lng: 18.64, name: "İsveç" },
  NO: { lat: 60.47, lng: 8.47, name: "Norveç" },
  DK: { lat: 56.26, lng: 9.5, name: "Danimarka" },
  FI: { lat: 61.92, lng: 25.75, name: "Finlandiya" },
  CH: { lat: 46.82, lng: 8.23, name: "İsviçre" },
  AT: { lat: 47.52, lng: 14.55, name: "Avusturya" },
  BE: { lat: 50.5, lng: 4.47, name: "Belçika" },
  AZ: { lat: 40.14, lng: 47.58, name: "Azerbaycan" },
  GE: { lat: 42.32, lng: 43.36, name: "Gürcistan" },
  AM: { lat: 40.07, lng: 45.04, name: "Ermenistan" },
  IR: { lat: 32.43, lng: 53.69, name: "İran" },
  IQ: { lat: 33.22, lng: 43.68, name: "Irak" },
  SY: { lat: 34.8, lng: 38.99, name: "Suriye" },
  SA: { lat: 23.89, lng: 45.08, name: "Suudi Arabistan" },
  AE: { lat: 23.42, lng: 53.85, name: "BAE" },
  QA: { lat: 25.35, lng: 51.18, name: "Katar" },
  KW: { lat: 29.31, lng: 47.48, name: "Kuveyt" },
  BH: { lat: 26.07, lng: 50.56, name: "Bahreyn" },
  OM: { lat: 21.47, lng: 55.98, name: "Oman" },
  JO: { lat: 30.59, lng: 36.24, name: "Ürdün" },
  IL: { lat: 31.05, lng: 34.85, name: "İsrail" },
  EG: { lat: 26.82, lng: 30.8, name: "Mısır" },
  CN: { lat: 35.86, lng: 104.2, name: "Çin" },
  JP: { lat: 36.2, lng: 138.25, name: "Japonya" },
  KR: { lat: 35.91, lng: 127.77, name: "Güney Kore" },
  IN: { lat: 20.59, lng: 78.96, name: "Hindistan" },
  PK: { lat: 30.38, lng: 69.35, name: "Pakistan" },
  ID: { lat: -0.79, lng: 113.92, name: "Endonezya" },
  MY: { lat: 4.21, lng: 101.98, name: "Malezya" },
  SG: { lat: 1.35, lng: 103.82, name: "Singapur" },
  TH: { lat: 15.87, lng: 100.99, name: "Tayland" },
  VN: { lat: 14.06, lng: 108.28, name: "Vietnam" },
  KZ: { lat: 48.02, lng: 66.92, name: "Kazakistan" },
  AU: { lat: -25.27, lng: 133.78, name: "Avustralya" },
  NZ: { lat: -40.9, lng: 174.89, name: "Yeni Zelanda" },
  CA: { lat: 56.13, lng: -106.35, name: "Kanada" },
  MX: { lat: 23.63, lng: -102.55, name: "Meksika" },
  BR: { lat: -14.24, lng: -51.93, name: "Brezilya" },
  AR: { lat: -38.42, lng: -63.62, name: "Arjantin" },
  ZA: { lat: -30.56, lng: 22.94, name: "Güney Afrika" },
  NG: { lat: 9.08, lng: 8.68, name: "Nijerya" },
  CY: { lat: 35.13, lng: 33.43, name: "Kıbrıs" },
};

const VIOLET: [number, number, number] = [0.545, 0.361, 0.965];
const AMBER: [number, number, number] = [0.98, 0.75, 0.14];
const THETA = 0.32;

// Mirrors cobe's marker vertex shader (lat/lng -> unit-sphere -> phi/theta rotation),
// so click hit-testing lines up with what's actually drawn on screen.
function projectMarker(lat: number, lng: number, phi: number) {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const o = Math.cos(r);
  const px = -o * Math.cos(a);
  const py = Math.sin(r);
  const pz = o * Math.sin(a);

  const c = Math.cos(THETA), d = Math.sin(THETA), e = Math.cos(phi), f = Math.sin(phi);
  const x = e * px + f * pz;
  const y = f * d * px + c * py - e * d * pz;
  const z = -f * c * px + d * py + e * c * pz;
  const visible = !(z < 0 && Math.hypot(x, y) < 0.8);
  return { x, y, visible };
}

export function WorldMemberGlobe({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryGeoEntry[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const phiRef = useRef(4.9);
  const widthRef = useRef(0);
  const pointerDown = useRef<number | null>(null);
  const dragged = useRef(false);
  const markersRef = useRef<Marker[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; code: string } | null>(null);

  const plotted = useMemo(
    () =>
      countries
        .filter((c) => COUNTRY_COORDS[c.code])
        .map((c) => ({ ...c, ...COUNTRY_COORDS[c.code] })),
    [countries]
  );

  const maxCount = Math.max(1, ...plotted.map((d) => d.member_count));

  const markers: Marker[] = useMemo(
    () =>
      plotted.map((c) => ({
        location: [c.lat, c.lng],
        size: 0.05 + (c.member_count / maxCount) * 0.1,
        color: c.code === selected ? AMBER : VIOLET,
      })),
    [plotted, maxCount, selected]
  );
  markersRef.current = markers;

  const findMarkerAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 2;
      let best: { code: string; dist: number } | null = null;
      for (const c of plotted) {
        const p = projectMarker(c.lat, c.lng, phiRef.current);
        if (!p.visible) continue;
        const px = p.x * radius;
        const py = -p.y * radius;
        const dist = Math.hypot(px - cx, py - cy);
        if (dist < 38 && (!best || dist < best.dist)) best = { code: c.code, dist };
      }
      return best?.code ?? null;
    },
    [plotted]
  );

  useEffect(() => {
    let raf: number;
    let destroyed = false;

    const onResize = () => {
      if (canvasRef.current) widthRef.current = canvasRef.current.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const dark = isDark ? 1 : 0;
    const baseColor: [number, number, number] = isDark ? [0.1, 0.09, 0.22] : [0.9, 0.88, 0.98];
    const glowColor: [number, number, number] = isDark ? [0.42, 0.32, 0.78] : [0.8, 0.75, 0.98];

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: phiRef.current,
      theta: THETA,
      dark,
      diffuse: 1.3,
      mapSamples: 18000,
      mapBrightness: isDark ? 7 : 3.4,
      baseColor,
      markerColor: VIOLET,
      glowColor,
      markers: markersRef.current,
    });

    const loop = () => {
      if (destroyed) return;
      if (pointerDown.current === null) phiRef.current += 0.0032;
      globe.update({
        phi: phiRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
        markers: markersRef.current,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    }, 50);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, [isDark]);

  return (
    <div ref={wrapRef} className="relative h-[420px] sm:h-[520px] w-full rounded-3xl overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="h-full aspect-square opacity-0 transition-opacity duration-700 [contain:layout_paint_size] cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          pointerDown.current = e.clientX;
          dragged.current = false;
        }}
        onPointerMove={(e) => {
          if (pointerDown.current !== null) {
            const delta = e.clientX - pointerDown.current;
            if (Math.abs(delta) > 3) dragged.current = true;
            phiRef.current += delta / 300;
            pointerDown.current = e.clientX;
          }
          const code = findMarkerAt(e.clientX, e.clientY);
          setTooltip(code ? { x: e.clientX, y: e.clientY, code } : null);
        }}
        onPointerUp={(e) => {
          pointerDown.current = null;
          if (!dragged.current) {
            const code = findMarkerAt(e.clientX, e.clientY);
            if (code) onSelect(code);
          }
        }}
        onPointerLeave={() => {
          pointerDown.current = null;
          setTooltip(null);
        }}
      />
      {tooltip && wrapRef.current && (
        <div
          className="pointer-events-none absolute z-10 px-2 py-1 rounded-lg text-[11px] font-bold bg-black/85 text-white -translate-x-1/2 -translate-y-full shadow-lg"
          style={{
            left: tooltip.x - wrapRef.current.getBoundingClientRect().left,
            top: tooltip.y - wrapRef.current.getBoundingClientRect().top - 10,
          }}
        >
          {tooltip.code}
        </div>
      )}
    </div>
  );
}

export { COUNTRY_COORDS };

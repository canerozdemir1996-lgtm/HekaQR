"use client";

import { useMemo } from "react";
import { GlobeInteractive, type InteractiveMarker } from "@/components/ui/globe-interactive";

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

export function WorldMemberGlobe({
  countries,
  selected,
  onSelect,
  isDark = true,
}: {
  countries: CountryGeoEntry[];
  selected: string | null;
  onSelect: (code: string) => void;
  isDark?: boolean;
}) {
  const markers: InteractiveMarker[] = useMemo(
    () =>
      countries
        .filter((c) => COUNTRY_COORDS[c.code])
        .map((c) => ({
          id: c.code,
          location: [COUNTRY_COORDS[c.code].lat, COUNTRY_COORDS[c.code].lng] as [number, number],
          name: c.code,
          users: c.member_count,
        })),
    [countries]
  );

  return (
    <div className="h-[420px] sm:h-[520px] w-full rounded-3xl overflow-hidden flex items-center justify-center">
      <div className="h-full max-w-full">
        <GlobeInteractive
          markers={markers}
          isDark={isDark}
          selected={selected}
          onSelect={(id) => {
            // GlobeInteractive sends null when the already-active marker is
            // clicked again; re-send the current code so the page's own
            // toggle logic (prev === code ? null : code) clears it.
            if (id) onSelect(id);
            else if (selected) onSelect(selected);
          }}
          className="h-full w-auto"
        />
      </div>
    </div>
  );
}

export { COUNTRY_COORDS };

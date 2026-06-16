"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

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

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function useGridTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#1e2a5e");
    gradient.addColorStop(0.5, "#16204a");
    gradient.addColorStop(1, "#1e2a5e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(167, 139, 250, 0.55)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= canvas.width; x += canvas.width / 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += canvas.height / 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  }, []);
}

function Globe({ radius }: { radius: number }) {
  const texture = useGridTexture();
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial map={texture} roughness={0.7} metalness={0.2} emissive="#3730a3" emissiveIntensity={0.15} />
      </mesh>
      {/* Outer atmosphere glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.04, 48, 48]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Marker({
  entry,
  radius,
  maxCount,
  active,
  onSelect,
}: {
  entry: CountryGeoEntry & { lat: number; lng: number; name: string };
  radius: number;
  maxCount: number;
  active: boolean;
  onSelect: (code: string) => void;
}) {
  const pos = useMemo(() => latLngToVector3(entry.lat, entry.lng, radius + 0.02), [entry.lat, entry.lng, radius]);
  const scale = 0.06 + (entry.member_count / maxCount) * 0.22;
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const pulse = active ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15 : 1;
    ref.current.scale.setScalar(scale * pulse);
  });

  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entry.code);
      }}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={active ? "#fbbf24" : "#8b5cf6"}
        emissive={active ? "#fbbf24" : "#7c3aed"}
        emissiveIntensity={active ? 1.2 : 0.6}
      />
    </mesh>
  );
}

function Scene({
  data,
  selected,
  onSelect,
}: {
  data: (CountryGeoEntry & { lat: number; lng: number; name: string })[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const radius = 2.2;
  const maxCount = Math.max(1, ...data.map((d) => d.member_count));

  return (
    <>
      <ambientLight intensity={1.1} />
      <pointLight position={[5, 3, 5]} intensity={1.8} />
      <pointLight position={[-5, -2, -4]} intensity={0.5} color="#8b5cf6" />
      <Globe radius={radius} />
      {data.map((entry) => (
        <Marker
          key={entry.code}
          entry={entry}
          radius={radius}
          maxCount={maxCount}
          active={selected === entry.code}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={7}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </>
  );
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
  const plotted = useMemo(
    () =>
      countries
        .filter((c) => COUNTRY_COORDS[c.code])
        .map((c) => ({ ...c, ...COUNTRY_COORDS[c.code] })),
    [countries]
  );

  return (
    <div className="relative h-[420px] sm:h-[520px] w-full rounded-3xl overflow-hidden bg-[#060a18]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Scene data={plotted} selected={selected} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}

export { COUNTRY_COORDS };

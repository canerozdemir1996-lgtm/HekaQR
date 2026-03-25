// @ts-nocheck
"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.Points>(null!);
  
  // Performans için parçacıkları sadece bir kere hesapla
  const [positions] = useState(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 50; // Geniş bir alana yay
    }
    return pos;
  });

  // Her karede (frame) parçacıkları yavaşça döndür
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x -= delta * 0.02;
      meshRef.current.rotation.y -= delta * 0.03;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={isDark ? "#ffffff" : "#000000"}
        transparent
        opacity={isDark ? 0.4 : 0.15}
        sizeAttenuation
      />
    </points>
  );
}

function WireframeGlobe({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} scale={2.5}>
      <icosahedronGeometry args={[4, 2]} />
      <meshBasicMaterial
        color={isDark ? "#7c3aed" : "#a78bfa"}
        wireframe
        transparent
        opacity={isDark ? 0.2 : 0.4}
      />
    </mesh>
  );
}

export default function ThreeBackground({ isDark }: { isDark: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // Hydration hatasını önlemek için

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <fog attach="fog" args={[isDark ? "#000000" : "#fafafa", 5, 25]} />
        <Particles isDark={isDark} />
        <WireframeGlobe isDark={isDark} />
      </Canvas>
      {/* UI ile yumuşak geçiş için alt tarafa Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? "from-black via-black/30 to-transparent" : "from-[#fafafa] via-[#fafafa]/30 to-transparent"}`} />
    </div>
  );
}
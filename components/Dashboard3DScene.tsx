"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function FloatingBlocks() {
  const groupRef = useRef<any>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 5, 2]} intensity={2} color="#8b5cf6" />
      <directionalLight position={[-2, -5, -2]} intensity={1} color="#3b82f6" />
      {[...Array(15)].map((_, i) => {
        const x = (Math.random() - 0.5) * 6;
        const y = (Math.random() - 0.5) * 6;
        const z = (Math.random() - 0.5) * 6;
        const scale = Math.random() * 0.6 + 0.2;
        return (
          <mesh key={i} position={[x, y, z]} scale={scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#a855f7" : "#4f46e5"}
              transparent
              opacity={0.4}
              wireframe={i % 3 === 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Dashboard3DScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <FloatingBlocks />
    </Canvas>
  );
}
"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function AdminNetwork3D() {
  const groupRef = useRef<any>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#06b6d4" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#10b981" />
      {[...Array(40)].map((_, i) => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = Math.random() * 3 + 2;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#06b6d4" : "#10b981"} transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Admin3DScene() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
      <AdminNetwork3D />
    </Canvas>
  );
}
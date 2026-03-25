"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground({ isDark }: { isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(isDark ? 0x000000 : 0xfafafa, 5, 25);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 15;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear previous canvas if any
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 1. Particles
    const particleCount = 3000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      particlePositions[i] = (Math.random() - 0.5) * 50;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      color: isDark ? 0xffffff : 0x000000,
      transparent: true,
      opacity: isDark ? 0.4 : 0.15,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 2. Wireframe Globe (Icosahedron)
    const globeGeometry = new THREE.IcosahedronGeometry(4, 2);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: isDark ? 0x7c3aed : 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.2 : 0.4,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.scale.set(2.5, 2.5, 2.5);
    scene.add(globe);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      particles.rotation.x -= delta * 0.02;
      particles.rotation.y -= delta * 0.03;

      globe.rotation.x += delta * 0.15;
      globe.rotation.y += delta * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      particleGeometry.dispose();
      particleMaterial.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div ref={containerRef} className="absolute inset-0" />
      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? "from-black via-black/30 to-transparent" : "from-[#fafafa] via-[#fafafa]/30 to-transparent"}`} />
    </div>
  );
}
"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { Html, PresentationControls, Environment, RoundedBox, ContactShadows } from "@react-three/drei";
import { Building2, Phone, Mail } from "lucide-react";

export default function VCard3DPreview({ vcard }: { vcard: any }) {
  return (
    <Canvas camera={{ position: [0, 0, 7.5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1} castShadow />
      <Environment preset="city" />
      
      <PresentationControls
        global
        rotation={[0, -0.15, 0]}
        polar={[-0.1, 0.2]}
        azimuth={[-0.5, 0.5]}
        config={{ mass: 2, tension: 400 }}
        snap={{ mass: 4, tension: 400 }}
      >
        <group position={[0, -0.2, 0]}>
          {/* Phone Chassis */}
          <RoundedBox args={[2.5, 5.0, 0.2]} radius={0.25} smoothness={8} castShadow receiveShadow>
            <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
          </RoundedBox>

          {/* Screen Bezel Line */}
          <RoundedBox args={[2.4, 4.9, 0.21]} radius={0.2} smoothness={8}>
            <meshStandardMaterial color="#020617" roughness={0.5} />
          </RoundedBox>

          {/* Dynamic Island / Notch */}
          <mesh position={[0, 2.25, 0.11]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.07, 0.5, 4, 16]} />
            <meshStandardMaterial color="#000000" roughness={0.1} />
          </mesh>

          {/* Camera Lens in Notch */}
          <mesh position={[0.15, 2.25, 0.12]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0} metalness={1} />
          </mesh>

          {/* Screen HTML Projection */}
          <Html
            transform
            wrapperClass="htmlScreen"
            distanceFactor={1.55}
            position={[0, 0, 0.106]}
            style={{
              width: '320px',
              height: '650px',
              borderRadius: '2rem',
              overflow: 'hidden',
              backgroundColor: '#0f172a',
            }}
          >
            <div className="w-full h-full text-slate-200 overflow-y-auto custom-scrollbar flex flex-col font-sans relative" style={{ backgroundColor: '#0f172a' }}>
              
              {/* VCard Cover */}
              <div className="h-32 relative shrink-0" style={{ backgroundColor: vcard?.coverColor || '#0f172a' }}>
                <div className="absolute -bottom-6 left-0 right-0 h-12 bg-[#0f172a]" style={{ clipPath: 'ellipse(100% 100% at 50% 100%)' }} />
              </div>

              {/* Avatar */}
              <div className="px-6 relative -mt-12 z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-[#0f172a] shadow-xl flex items-center justify-center text-3xl font-black text-white" style={{ background: `linear-gradient(135deg, ${vcard?.accentColor || '#7c3aed'}, #4f46e5)` }}>
                  {vcard?.firstName?.[0] || ""}{vcard?.lastName?.[0] || ""}
                </div>
                <h2 className="mt-3 text-xl font-black text-white text-center leading-tight">
                  {vcard?.firstName} {vcard?.lastName}
                </h2>
                <p className="text-sm font-semibold mt-1 text-center" style={{ color: vcard?.accentColor || '#7c3aed' }}>{vcard?.title}</p>
                {vcard?.company && <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1"><Building2 size={12}/> {vcard.company}</p>}
              </div>

              {/* Bio */}
              {vcard?.bio && (
                <div className="px-6 mt-6 text-center">
                  <p className="text-xs text-slate-300 leading-relaxed opacity-90">{vcard.bio}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-6 mt-6 flex gap-3">
                <button className="flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-transform active:scale-95" style={{ backgroundColor: vcard?.accentColor || '#7c3aed' }}>
                  Rehbere Kaydet
                </button>
              </div>

              {/* Contact List */}
              <div className="px-6 mt-6 space-y-3 pb-12">
                {vcard?.phone && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-300"><Phone size={16} /></div>
                    <div><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Telefon</p><p className="text-sm font-semibold text-white">{vcard.phone}</p></div>
                  </div>
                )}
                {vcard?.email && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-300"><Mail size={16} /></div>
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">E-Posta</p><p className="text-sm font-semibold text-white truncate">{vcard.email}</p></div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {vcard?.instagram && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Instagram</span>}
                  {vcard?.linkedin && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">LinkedIn</span>}
                  {vcard?.twitter && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20">X (Twitter)</span>}
                </div>
              </div>
            </div>
          </Html>
        </group>
      </PresentationControls>
      <ContactShadows position={[0, -2.8, 0]} opacity={0.5} scale={12} blur={2.5} far={4} color="#000000" />
    </Canvas>
  );
}
"use client";

import React from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, UserPlus, Linkedin, Twitter } from "lucide-react";

export function VCardPreview() {
  return (
    <CardContainer className="inter-var">
      {/* Ana Kart Gövdesi - Cam Efektli (Glassmorphism) ve Parlak Kenarlı */}
      <CardBody className="bg-white/10 dark:bg-black/40 backdrop-blur-xl relative group/card border border-white/20 dark:border-white/10 w-auto sm:w-[350px] h-auto rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_8px_32px_0_rgba(168,85,247,0.15)] hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.3)] transition-all duration-500">
        
        {/* Profil Resmi - Z Ekseninde Dışarı Çıkar (translateZ) */}
        <CardItem translateZ="100" className="w-32 h-32 mt-4 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 blur-md opacity-50 group-hover/card:opacity-100 transition-opacity duration-500"></div>
          <img
            src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop"
            height="1000"
            width="1000"
            className="h-full w-full object-cover rounded-full border-4 border-white/20 dark:border-slate-800/50 relative z-10"
            alt="Profil"
          />
        </CardItem>

        {/* İsim ve Unvan */}
        <CardItem translateZ="50" className="mt-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Alexander Sterling
          </h2>
          <p className="text-violet-600 dark:text-violet-400 font-medium mt-1">
            Senior Growth Architect
          </p>
        </CardItem>

        {/* İletişim Bilgileri (Hafif dışarı çıkar) */}
        <CardItem translateZ="60" className="w-full mt-8 space-y-3">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 bg-white/5 dark:bg-white/5 p-3 rounded-xl border border-white/10">
            <Phone className="w-4 h-4 mr-3 text-violet-500" />
            +1 (555) 123-4567
          </div>
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 bg-white/5 dark:bg-white/5 p-3 rounded-xl border border-white/10">
            <Mail className="w-4 h-4 mr-3 text-violet-500" />
            alexander@hekaqr.com
          </div>
        </CardItem>

        {/* Sosyal Medya İkonları */}
        <CardItem translateZ="80" className="flex gap-4 mt-6">
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-colors text-slate-600 dark:text-slate-300 border border-white/10">
            <Linkedin className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-colors text-slate-600 dark:text-slate-300 border border-white/10">
            <Twitter className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-colors text-slate-600 dark:text-slate-300 border border-white/10">
            <MapPin className="w-4 h-4" />
          </button>
        </CardItem>

        {/* Rehbere Ekle Butonu - En çok dışarı çıkan öğe */}
        <CardItem translateZ="120" className="w-full mt-8 mb-4">
          <Button variant="default" className="w-full h-12 text-base rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <UserPlus className="w-5 h-5 mr-2" />
            Rehbere Kaydet
          </Button>
        </CardItem>

      </CardBody>
    </CardContainer>
  );
}
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Stüdyo artık Şablonlar ile birleştirildi
export default function StudioRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/templates"); }, [router]);
  return null;
}

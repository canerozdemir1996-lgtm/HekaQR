"use client";

import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ScanLine, QrCode, Activity } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export function DynamicStats() {
  const [stats, setStats] = useState({ totalScans: 0, activeQrs: 0, totalQrs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const sb = getSupabase();
        
        // Aktif kullanıcıyı al
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // Kullanıcıya ait tüm QR kodların istatistiklerini çek
        const { data: qrs, error } = await sb
          .from("qr_codes")
          .select("scan_count, is_active")
          .eq("user_id", user.id);

        if (error) throw error;

        if (qrs) {
          const totalScans = qrs.reduce((acc, curr) => acc + (curr.scan_count || 0), 0);
          const activeQrs = qrs.filter(q => q.is_active).length;
          const totalQrs = qrs.length;
          
          setStats({ totalScans, activeQrs, totalQrs });
        }
      } catch (error) {
        console.error("İstatistikler çekilirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="skeleton h-48 rounded-3xl w-full" />
        <div className="skeleton h-48 rounded-3xl w-full" />
        <div className="skeleton h-48 rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      <StatCard
        title="Toplam Tarama"
        value={stats.totalScans.toLocaleString("tr-TR")}
        icon={<ScanLine size={20} />}
        color="#8b5cf6" // Violet
      />
      <StatCard
        title="Aktif Kampanyalar"
        value={stats.activeQrs.toLocaleString("tr-TR")}
        icon={<Activity size={20} />}
        color="#10b981" // Emerald
      />
      <StatCard
        title="Toplam QR Kod"
        value={stats.totalQrs.toLocaleString("tr-TR")}
        icon={<QrCode size={20} />}
        color="#f59e0b" // Amber
      />
    </div>
  );
}
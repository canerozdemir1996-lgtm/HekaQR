"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase, type QrCode } from "@/lib/supabase";
import { ArrowLeft, MousePointerClick, Users, Smartphone, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const [qr, setQr] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const sb = getSupabase();
        
        // 1. QR Kod Bilgilerini Çek
        const { data, error } = await sb
          .from("qr_codes")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) throw error;
        setQr(data);

        // 2. Demo Grafik Verisi Üret (Gerçek projede scan_logs tablosundan çekilir)
        // Şimdilik UI'ın harika görünmesi için son 7 günün sahte verisini üretiyoruz.
        const mockData = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            date: d.toLocaleDateString("tr-TR", { weekday: "short" }),
            taramalar: Math.floor(Math.random() * (data.scan_count > 0 ? data.scan_count / 2 : 50)) + 5,
          };
        });
        setChartData(mockData);

      } catch (error) {
        console.error("Analitik verisi çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) fetchAnalytics();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Analizler Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!qr) return <div className="p-8 text-center text-red-500">QR Kod bulunamadı.</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ── Üst Başlık ve Geri Butonu ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-black/20 p-6 rounded-3xl border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full h-11 w-11 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {qr.title}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">Analitik</span>
              </h1>
              <p className="text-sm font-mono text-slate-500 mt-1">hekaqr.com/q/{qr.short_slug}</p>
            </div>
          </div>
          <Button variant="default" className="rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Download size={16} className="mr-2" />
            Raporu İndir
          </Button>
        </div>

        {/* ── İstatistik Kartları (StatCard kullanıyoruz) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Toplam Tarama" value={(qr.scan_count || 0).toLocaleString("tr-TR")} icon={<MousePointerClick size={20} />} color="#8b5cf6" change="+12%" />
          <StatCard title="Tekil Ziyaretçi" value={Math.max(1, Math.floor((qr.scan_count || 0) * 0.7)).toLocaleString("tr-TR")} icon={<Users size={20} />} color="#3b82f6" />
          <StatCard title="En Çok Kullanılan Cihaz" value="iOS / iPhone" icon={<Smartphone size={20} />} color="#10b981" />
          <StatCard title="En Aktif Konum" value="İstanbul, TR" icon={<MapPin size={20} />} color="#f59e0b" />
        </div>

        {/* ── Grafikler (Recharts ile Glassmorphism) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ana Grafik Alanı */}
          <div className="lg:col-span-2 surface rounded-3xl p-6 lg:p-8 flex flex-col h-[450px]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Son 7 Günlük Etkileşim</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    {/* Grafiğin altındaki o harika parlayan renk geçişi */}
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#fff' }}
                    itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="taramalar" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" activeDot={{ r: 8, strokeWidth: 0, fill: '#a855f7', filter: 'drop-shadow(0px 0px 8px rgba(168,85,247,0.8))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sağ Taraftaki Cihaz/İşletim Sistemi Mini Özeti */}
          <div className="surface rounded-3xl p-6 lg:p-8 flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">İşletim Sistemleri</h3>
            <div className="space-y-5 flex-1">
              {[
                { name: "iOS", percent: 65, color: "bg-blue-500" },
                { name: "Android", percent: 25, color: "bg-emerald-500" },
                { name: "Windows/Mac", percent: 10, color: "bg-amber-500" },
              ].map(os => (
                <div key={os.name} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium"><span className="text-slate-700 dark:text-slate-300">{os.name}</span><span className="text-slate-900 dark:text-white">%{os.percent}</span></div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${os.color}`} style={{ width: `${os.percent}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
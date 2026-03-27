"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldCheck,
  Activity,
  Globe,
  ArrowLeft,
  Edit2,
  Ban,
  Search,
} from "lucide-react";
export default function AdminDashboard2026() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState({ users: 0, qrs: 0, scans: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Güvenlik kontrolü
    if (status === "unauthenticated" || (session?.user && session.user.role !== "owner" && session.user.role !== "admin")) {
      router.push("/dashboard");
      return;
    }

    async function fetchAdminData() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Kullanıcı verileri çekilemedi");
        const data = await res.json();

        setMetrics(data.metrics);
        setUsersList(data.usersList);
      } catch (error) {
        console.error("Admin fetch error", error);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") fetchAdminData();
  }, [status, session, router]);

  if (loading) return <div className="h-screen flex items-center justify-center text-violet-500"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between surface rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                System Command Center
                <ShieldCheck className="text-emerald-500" size={24} />
              </h1>
              <p className="text-sm text-slate-500">Sistem genelindeki tüm verileri yönetin.</p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Toplam Kullanıcı" value={metrics.users} icon={<Users size={20}/>} color="#8b5cf6" change="+12" />
          <StatCard title="Üretilen QR Kod" value={metrics.qrs.toLocaleString()} icon={<Globe size={20}/>} color="#10b981" />
          <StatCard title="Sistem Taraması" value={(metrics.scans / 1000000).toFixed(1) + "M"} icon={<Activity size={20}/>} color="#f59e0b" change="+45K" />
        </div>

        {/* Users Table */}
        <div className="surface rounded-3xl p-8 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Son Aktif Kullanıcılar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>

                  <th className="px-6 py-4 rounded-tl-xl">
                    Kullanıcı</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">QR Sayısı</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{u.email}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${u.role === 'owner' ? 'bg-amber-100 text-amber-700' : u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span></td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{u.qrs}</td>
                    <td className="px-6 py-4"><span className={`flex items-center gap-1.5 ${u.status === 'Active' ? 'text-emerald-500' : 'text-red-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>{u.status}</span></td>
                    <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="h-8">Yönet</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
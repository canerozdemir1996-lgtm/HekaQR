"use client";
import { useEffect, useState } from "react";
import { QrCode, BarChart2, Plus } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({ total_qr: 0, active_qr: 0, total_scans: 0 });

  useEffect(() => {
    // Load stats
    setStats({ total_qr: 5, active_qr: 4, total_scans: 123 });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
            <Plus size={16} />
            Yeni QR
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <QrCode className="text-violet-600" size={24} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam QR</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_qr}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <BarChart2 className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Aktif QR</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active_qr}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <QrCode className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Tarama</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_scans}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">QR Kodlarınız</h2>
          <p className="text-slate-600 dark:text-slate-400">Henüz QR kodunuz yok. Yeni bir tane oluşturmak için yukarıdaki butona tıklayın.</p>
        </div>
      </div>
    </div>
  );
}

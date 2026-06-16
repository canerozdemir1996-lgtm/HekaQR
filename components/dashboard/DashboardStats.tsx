"use client";
import { BarChart3, Zap, Activity, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    total_qr: number;
    active_qr: number;
    total_scans: number;
    scans_today: number;
  };
  isDark: boolean;
}

const STAT_ITEMS = [
  {
    id: "total_qr",
    label: "Toplam QR",
    icon: Zap,
    color: "#7c3aed",
    key: "total_qr" as const,
  },
  {
    id: "active_qr",
    label: "Aktif QR",
    icon: Activity,
    color: "#10b981",
    key: "active_qr" as const,
  },
  {
    id: "total_scans",
    label: "Toplam Tarama",
    icon: BarChart3,
    color: "#3b82f6",
    key: "total_scans" as const,
  },
  {
    id: "scans_today",
    label: "Bugün Tarama",
    icon: TrendingUp,
    color: "#f59e0b",
    key: "scans_today" as const,
  },
];

export function DashboardStats({ stats, isDark }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];

        return (
          <div
            key={item.id}
            className={`group rounded-2xl p-6 border transition-all duration-300 ${
              isDark
                ? "bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/8"
                : "bg-white/60 backdrop-blur-md border-white/40 hover:border-white/60 hover:bg-white/80"
            } hover:shadow-lg hover:shadow-violet-500/20 hover:scale-105 cursor-default`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `${item.color}20`,
                  color: item.color,
                  boxShadow: `0 0 16px ${item.color}30`,
                }}
              >
                <Icon size={20} />
              </div>
              <div
                className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider"
                style={{
                  background: `${item.color}18`,
                  color: item.color,
                  border: `1px solid ${item.color}30`,
                }}
              >
                {item.id === "scans_today" ? "+Bugün" : "Canlı"}
              </div>
            </div>

            <p className={`text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {item.label}
            </p>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {value.toLocaleString("tr-TR")}
            </p>

            {item.id === "scans_today" && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span style={{ color: item.color }}>
                  {Math.round((value / stats.total_scans) * 100) || 0}% of daily
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

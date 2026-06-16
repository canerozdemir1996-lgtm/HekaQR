"use client";
import { useState } from "react";
import { Search, Plus, Sun, Moon, LogOut, Settings, Menu, X } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  onCreateClick: () => void;
  onSearchChange: (value: string) => void;
  currentUserEmail: string;
  isDark: boolean;
  onThemeToggle: () => void;
  onLogout: () => void;
  onSettingsClick: () => void;
}

export function DashboardHeader({
  onCreateClick,
  onSearchChange,
  currentUserEmail,
  isDark,
  onThemeToggle,
  onLogout,
  onSettingsClick,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <div
        className={`sticky top-0 z-40 border-b backdrop-blur-2xl transition-all duration-300 ${
          isDark ? "bg-black/40 border-white/10" : "bg-white/40 border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-8xl mx-auto">
          {/* Left: Logo + Search */}
          <div className="flex items-center gap-4 flex-1">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 11h8V3H3v8zm0 8h8v-8H3v8zm8-8h8V3h-8v8zm0 8h8v-8h-8v8z" />
                </svg>
              </div>
              <span className="font-black text-sm hidden sm:inline">
                QR<span style={{ background: "linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hub</span>
              </span>
            </Link>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white/50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Search size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                <input
                  type="text"
                  placeholder="QR ara..."
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`bg-transparent outline-none text-sm placeholder:text-slate-400 ${
                    isDark ? "text-slate-200" : "text-slate-800"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onCreateClick}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300
                bg-gradient-to-r from-violet-500 to-indigo-600
                hover:shadow-lg hover:shadow-violet-500/50 hover:scale-105
                active:scale-95"
            >
              <Plus size={14} /> Yeni QR
            </button>

            <button
              onClick={onThemeToggle}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={onSettingsClick}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings size={16} />
            </button>

            <button
              onClick={onLogout}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  : "text-slate-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <LogOut size={16} />
            </button>

            <div className="hidden sm:block w-1 h-6 bg-gradient-to-b from-white/20 to-white/0 rounded"></div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>QR Hub</p>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  {currentUserEmail.split("@")[0]}
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-lg sm:hidden transition-all duration-300 ${
                  isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className={`border-b backdrop-blur-2xl transition-all duration-300 ${
            isDark ? "bg-black/40 border-white/10" : "bg-white/40 border-slate-200"
          }`}
        >
          <div className="px-6 py-4 space-y-2">
            <button
              onClick={() => {
                onCreateClick();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300
                bg-gradient-to-r from-violet-500 to-indigo-600
                hover:shadow-lg hover:shadow-violet-500/50"
            >
              <Plus size={14} /> Yeni QR Oluştur
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
              <Search size={14} className="text-slate-500" />
              <input
                type="text"
                placeholder="QR ara..."
                onChange={(e) => onSearchChange(e.target.value)}
                className={`bg-transparent outline-none text-sm flex-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

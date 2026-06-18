"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Sun, Moon, LogOut, Settings, Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface DashboardHeaderProps {
  onCreateClick: () => void;
  onSearchChange: (value: string) => void;
  currentUserEmail?: string;
  isDark: boolean;
  onThemeToggle: () => void;
  onLogout: () => void;
  onSettingsClick: () => void;
}

export default function DashboardHeader({
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
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
        isDark ? "border-white/10 bg-black/50" : "border-slate-200 bg-white/70"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <BrandLogo className="w-[138px] sm:w-[164px]" width={420} height={134} />
        </Link>

        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search
            size={16}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          />
          <input
            type="search"
            placeholder="QR, slug veya klasör ara..."
            onChange={(e) => onSearchChange(e.target.value)}
            className={`h-11 w-full rounded-2xl border pl-10 pr-4 text-sm font-medium outline-none transition-colors ${
              isDark
                ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500"
                : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-violet-500"
            }`}
          />
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {currentUserEmail ? (
            <div
              className={`rounded-2xl border px-3 py-2 text-right ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/80"
              }`}
            >
              <p className={`max-w-[180px] truncate text-xs font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {currentUserEmail}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                QR Publish
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onThemeToggle}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
              isDark
                ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            title="Tema değiştir"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={onSettingsClick}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
              isDark
                ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            title="Ayarlar"
          >
            <Settings size={18} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
              isDark
                ? "border-white/10 bg-white/5 text-rose-300 hover:bg-rose-500/10"
                : "border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
            }`}
            title="Çıkış yap"
          >
            <LogOut size={18} />
          </button>

          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-500"
          >
            <Plus size={16} />
            Yeni QR
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border md:hidden ${
            isDark
              ? "border-white/10 bg-white/5 text-slate-200"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          title="Menü"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          className={`border-t px-4 pb-4 pt-3 md:hidden ${
            isDark ? "border-white/10 bg-black/70" : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="relative mb-3">
            <Search
              size={16}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <input
              type="search"
              placeholder="QR, slug veya klasör ara..."
              onChange={(e) => onSearchChange(e.target.value)}
              className={`h-11 w-full rounded-2xl border pl-10 pr-4 text-sm font-medium outline-none ${
                isDark
                  ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              }`}
            />
          </div>

          {currentUserEmail ? (
            <div
              className={`mb-3 rounded-2xl border px-4 py-3 ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              }`}
            >
              <p className={`truncate text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {currentUserEmail}
              </p>
              <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                QR Publish
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCreateClick}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white"
            >
              <Plus size={16} />
              Yeni QR
            </button>
            <button
              type="button"
              onClick={onThemeToggle}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-bold ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-200"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              Tema
            </button>
            <button
              type="button"
              onClick={onSettingsClick}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-bold ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-200"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Settings size={16} />
              Ayarlar
            </button>
            <button
              type="button"
              onClick={onLogout}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-bold ${
                isDark
                  ? "border-white/10 bg-white/5 text-rose-300"
                  : "border-slate-200 bg-white text-rose-600"
              }`}
            >
              <LogOut size={16} />
              Çıkış
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

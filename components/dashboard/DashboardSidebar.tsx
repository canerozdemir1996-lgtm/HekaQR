"use client";
import { useState } from "react";
import { ChevronDown, FolderPlus, Home } from "lucide-react";
import type { QrFolder } from "@/lib/supabase";

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  currentUserRole: string;
  isDark: boolean;
  folders: QrFolder[];
  folderFilter: string;
  onFolderChange: (folderId: string) => void;
}

const SECTIONS = [
  { id: "qrlist", label: "QR Kodları", icon: "⚡" },
  { id: "create", label: "Yeni QR", icon: "➕" },
  { id: "templates", label: "Şablonlar", icon: "🎨" },
  { id: "bulk", label: "Toplu Yükleme", icon: "📤" },
  { id: "analytics", label: "Analitik", icon: "📊" },
  { id: "messages", label: "Mesajlar", icon: "💬" },
];

const ADMIN_SECTIONS = [
  { id: "admin-users", label: "Kullanıcılar", icon: "👥" },
  { id: "admin-messages", label: "Mesajlar", icon: "📧" },
];

export function DashboardSidebar({
  activeSection,
  onSectionChange,
  currentUserRole,
  isDark,
  folders,
  folderFilter,
  onFolderChange,
}: DashboardSidebarProps) {
  const [foldersOpen, setFoldersOpen] = useState(false);
  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";

  return (
    <div
      className={`fixed left-0 top-0 h-screen w-64 pt-20 overflow-y-auto border-r backdrop-blur-2xl transition-all duration-300 ${
        isDark
          ? "bg-black/40 border-white/10"
          : "bg-white/40 border-slate-200"
      }`}
    >
      <div className="p-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Menü
          </p>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeSection === section.id
                  ? isDark
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : "bg-violet-50 text-violet-600 border border-violet-200"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Folders Section */}
        <div>
          <button
            onClick={() => setFoldersOpen(!foldersOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">📁</span>
              Klasörler
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${foldersOpen ? "rotate-180" : ""}`}
            />
          </button>

          {foldersOpen && (
            <div className="mt-2 ml-4 space-y-1 border-l border-white/10 pl-3">
              <button
                onClick={() => onFolderChange("all")}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-300 ${
                  folderFilter === "all"
                    ? isDark
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-violet-50 text-violet-600"
                    : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Home size={10} /> Tümü
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onFolderChange(folder.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-300 ${
                    folderFilter === folder.id
                      ? isDark
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-violet-50 text-violet-600"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  📂 {folder.name}
                </button>
              ))}

              <button
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-300 ${
                  isDark
                    ? "text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                    : "text-slate-500 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                <FolderPlus size={10} /> Yeni Klasör
              </button>
            </div>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-1 border-t border-white/10 pt-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Yönetim
            </p>
            {ADMIN_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeSection === section.id
                    ? isDark
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                    : isDark
                      ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>
        )}

        {/* Settings */}
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => onSectionChange("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeSection === "settings"
                ? isDark
                  ? "bg-slate-700/50 text-slate-200 border border-slate-600"
                  : "bg-slate-100 text-slate-800 border border-slate-300"
                : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span className="text-lg">⚙️</span>
            Ayarlar
          </button>
        </div>
      </div>
    </div>
  );
}

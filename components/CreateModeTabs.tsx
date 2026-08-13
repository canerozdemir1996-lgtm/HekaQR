"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { FileSpreadsheet, QrCode } from "lucide-react";

import { cn } from "@/lib/utils";

export type CreateMode = "single" | "bulk";

interface CreateModeTabsProps {
  mode: CreateMode;
  onModeChange: (mode: CreateMode) => void;
  className?: string;
}

const MODES = [
  {
    mode: "single",
    id: "qr-create-mode-single",
    panelId: "qr-create-single-panel",
    title: "Tek QR oluştur",
    description:
      "Tek bir QR kodu oluşturun; içerik ve tasarım ayarlarını ayrıntılı yönetin.",
    icon: QrCode,
    badge: "Tekli",
  },
  {
    mode: "bulk",
    id: "qr-create-mode-bulk",
    panelId: "qr-create-bulk-panel",
    title: "Toplu QR oluştur",
    description:
      "CSV/XLSX dosyanızdan 1–5.000 QR oluşturun. Starter ve üzeri paketlerde.",
    icon: FileSpreadsheet,
    badge: "CSV / XLSX",
  },
] as const;

export function CreateModeTabs({
  mode,
  onModeChange,
  className,
}: CreateModeTabsProps) {
  const [focusedMode, setFocusedMode] = useState<CreateMode>(mode);
  const tabRefs = useRef<Record<CreateMode, HTMLButtonElement | null>>({
    single: null,
    bulk: null,
  });

  useEffect(() => {
    setFocusedMode(mode);
  }, [mode]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentMode: CreateMode,
  ) => {
    let nextMode: CreateMode | null = null;

    if (event.key === "ArrowRight") {
      nextMode = currentMode === "single" ? "bulk" : "single";
    } else if (event.key === "ArrowLeft") {
      nextMode = currentMode === "single" ? "bulk" : "single";
    } else if (event.key === "Home") {
      nextMode = "single";
    } else if (event.key === "End") {
      nextMode = "bulk";
    }

    if (!nextMode) return;

    event.preventDefault();
    setFocusedMode(nextMode);
    tabRefs.current[nextMode]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="QR oluşturma yöntemi"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}
    >
      {MODES.map((item) => {
        const Icon = item.icon;
        const isActive = item.mode === mode;
        const isSingle = item.mode === "single";

        return (
          <button
            key={item.mode}
            ref={(element) => {
              tabRefs.current[item.mode] = element;
            }}
            id={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={item.panelId}
            tabIndex={focusedMode === item.mode ? 0 : -1}
            onFocus={() => setFocusedMode(item.mode)}
            onKeyDown={(event) => handleKeyDown(event, item.mode)}
            onClick={() => onModeChange(item.mode)}
            className={cn(
              "group relative flex min-h-32 w-full items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
              isActive
                ? isSingle
                  ? "border-violet-500 bg-violet-50/90 shadow-violet-500/10 focus-visible:ring-violet-500 dark:border-violet-400 dark:bg-violet-500/10"
                  : "border-emerald-500 bg-emerald-50/90 shadow-emerald-500/10 focus-visible:ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-500/10"
                : "border-slate-200 bg-white/80 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:hover:bg-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                isActive
                  ? isSingle
                    ? "border-violet-200 bg-violet-600 text-white dark:border-violet-400/30 dark:bg-violet-500"
                    : "border-emerald-200 bg-emerald-600 text-white dark:border-emerald-400/30 dark:bg-emerald-500"
                  : "border-slate-200 bg-slate-50 text-slate-500 group-hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200",
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  {item.title}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    isActive
                      ? isSingle
                        ? "border-violet-200 bg-white/70 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
                        : "border-emerald-200 bg-white/70 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {item.badge}
                </span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">
                {item.description}
              </span>
            </span>

            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-4 bottom-0 h-0.5 rounded-full transition-opacity",
                isActive
                  ? isSingle
                    ? "bg-violet-500 opacity-100"
                    : "bg-emerald-500 opacity-100"
                  : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default CreateModeTabs;

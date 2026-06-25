"use client";

import { useMemo, useRef } from "react";

export type DashboardDateFilterValue = {
  from: string;
  to: string;
  status: string;
  limit: number;
};

type StatusOption = { value: string; label: string };

type Props = DashboardDateFilterValue & {
  onChange: (next: Partial<DashboardDateFilterValue>) => void;
  statusOptions: StatusOption[];
  className?: string;
};

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateRange(kind: "today" | "yesterday" | "last7" | "last30" | "month") {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  if (kind === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (kind === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (kind === "last30") {
    start.setDate(start.getDate() - 29);
  } else if (kind === "month") {
    start.setDate(1);
  }
  return { from: localIso(start), to: localIso(end) };
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  };

  return (
    <label
      className="block min-w-0 cursor-pointer"
      onClick={(event) => {
        if (event.target !== inputRef.current) openPicker();
      }}
    >
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={openPicker}
        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

export function DashboardDateFilter({ from, to, status, limit, onChange, statusOptions, className = "" }: Props) {
  const presets = useMemo(
    () => [
      { key: "today" as const, label: "Bugün", range: dateRange("today") },
      { key: "yesterday" as const, label: "Dün", range: dateRange("yesterday") },
      { key: "last7" as const, label: "Son 7 Gün", range: dateRange("last7") },
      { key: "last30" as const, label: "Son 30 Gün", range: dateRange("last30") },
      { key: "month" as const, label: "Bu Ay", range: dateRange("month") },
    ],
    [],
  );

  return (
    <section className={`dashboard-card p-4 ${className}`}>
      <div className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {presets.map((preset) => {
          const active = from === preset.range.from && to === preset.range.to;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange({ ...preset.range })}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition ${active ? "border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,0.45fr)_110px]">
        <DateField label="Başlangıç" value={from} onChange={(value) => onChange({ from: value })} />
        <DateField label="Bitiş" value={to} onChange={(value) => onChange({ to: value })} />
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Durum</span>
          <select value={status} onChange={(event) => onChange({ status: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Liste</span>
          <select value={limit} onChange={(event) => onChange({ limit: Number(event.target.value) })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">
            {[20, 50, 100].map((value) => <option key={value} value={value}>{value} kayıt</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15 ${className}`}>
      <Icon className="mx-auto mb-3 text-violet-500" size={34} />
      <p className="text-lg font-black text-slate-900 dark:text-white">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-violet-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

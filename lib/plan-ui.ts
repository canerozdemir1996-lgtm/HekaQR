export type PlanUiKey = "free" | "trial" | "starter" | "basic" | "pro" | "business" | "enterprise" | "vip" | "lifetime" | "custom" | "owner" | string;

export type PlanStatusUiKey = "free" | "active" | "trial" | "expired" | "cancelled" | "past_due" | string;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  trial: "Deneme",
  starter: "Starter",
  basic: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
  vip: "VIP",
  lifetime: "Lifetime",
  custom: "Custom",
  owner: "Enterprise",
};

const STATUS_LABELS: Record<string, string> = {
  free: "Aktif",
  active: "Aktif",
  trial: "Deneme",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
  past_due: "Ödeme bekliyor",
};

export function normalizePlanUiKey(plan?: string | null): PlanUiKey {
  return String(plan || "free").toLowerCase();
}

export function planUiLabel(plan?: string | null, serverLabel?: string | null) {
  const trustedServerLabel = String(serverLabel ?? "").trim().slice(0, 40);
  if (trustedServerLabel) return trustedServerLabel;
  const key = normalizePlanUiKey(plan);
  return PLAN_LABELS[key] ?? key.replace(/[_-]+/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function planStatusUiLabel(status?: string | null) {
  const key = String(status || "active").toLowerCase();
  return STATUS_LABELS[key] ?? "Durum bilinmiyor";
}

export function planBadgePresentation(plan?: string | null, status?: string | null, serverLabel?: string | null) {
  const planKey = normalizePlanUiKey(plan);
  const statusKey = String(status || (planKey === "free" ? "free" : "active")).toLowerCase() as PlanStatusUiKey;
  const label = planUiLabel(planKey, serverLabel);
  const statusLabel = planStatusUiLabel(statusKey);
  const isAttention = statusKey === "expired" || statusKey === "cancelled" || statusKey === "past_due";

  return {
    planKey,
    statusKey,
    label,
    statusLabel,
    visibleLabel: isAttention ? `${label} · ${statusLabel}` : label,
    ariaLabel: `${label} planı, ${statusLabel}`,
    isAttention,
  };
}

export function planTheme(plan?: string | null) {
  const key = normalizePlanUiKey(plan);
  if (key === "starter" || key === "basic") {
    return {
      card: "border-blue-200 bg-blue-50/80 shadow-blue-200/30 dark:border-blue-500/25 dark:bg-blue-500/10",
      icon: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/25",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
      progress: "from-blue-500 to-cyan-400",
      accentText: "text-blue-700 dark:text-blue-200",
    };
  }
  if (key === "pro") {
    return {
      card: "border-violet-200 bg-violet-50/80 shadow-violet-200/30 dark:border-violet-500/25 dark:bg-violet-500/10",
      icon: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-violet-500/25",
      badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
      progress: "from-violet-500 to-fuchsia-400",
      accentText: "text-violet-700 dark:text-violet-200",
    };
  }
  if (key === "business") {
    return {
      card: "border-emerald-200 bg-emerald-50/80 shadow-emerald-200/30 dark:border-emerald-500/25 dark:bg-emerald-500/10",
      icon: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/25",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
      progress: "from-emerald-500 to-teal-400",
      accentText: "text-emerald-700 dark:text-emerald-200",
    };
  }
  if (key === "vip") {
    return {
      card: "border-amber-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 shadow-amber-200/40 dark:border-amber-500/25 dark:from-violet-500/10 dark:via-white/[0.03] dark:to-amber-500/10",
      icon: "bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white shadow-amber-500/25",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
      progress: "from-violet-500 via-fuchsia-400 to-amber-300",
      accentText: "text-amber-700 dark:text-amber-200",
    };
  }
  if (key === "enterprise" || key === "owner") {
    return {
      card: "border-teal-200 bg-teal-50/80 shadow-teal-200/30 dark:border-teal-500/25 dark:bg-teal-500/10",
      icon: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-teal-500/25",
      badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200",
      progress: "from-teal-500 to-emerald-400",
      accentText: "text-teal-700 dark:text-teal-200",
    };
  }
  if (key === "lifetime") {
    return {
      card: "border-rose-200 bg-rose-50/80 shadow-rose-200/30 dark:border-rose-500/25 dark:bg-rose-500/10",
      icon: "bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-rose-500/25",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
      progress: "from-rose-500 to-orange-400",
      accentText: "text-rose-700 dark:text-rose-200",
    };
  }
  return {
    card: "border-slate-200 bg-white/75 shadow-slate-200/30 dark:border-white/10 dark:bg-white/[0.03]",
    icon: "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-slate-500/20",
    badge: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    progress: "from-slate-500 to-slate-400",
    accentText: "text-slate-600 dark:text-slate-300",
  };
}

export function formatPlanDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function planExpiryLabel(plan?: string | null, expiresAt?: string | null) {
  const date = formatPlanDate(expiresAt);
  if (date) return `Bitiş: ${date}`;
  const key = normalizePlanUiKey(plan);
  if (key === "free" || key === "trial" || key === "vip" || key === "enterprise" || key === "owner") return "Süresiz";
  return "Bitiş bilgisi yok";
}

export function limitLabel(value?: number | null, unit?: string) {
  const suffix = unit ? ` ${unit}` : "";
  if (value === -1) return `Sınırsız${suffix}`;
  if (typeof value !== "number") return `0${suffix}`;
  return `${value.toLocaleString("tr-TR")}${suffix}`;
}

export function usageLimitLabel(used: number, limit: number, unit: string) {
  if (limit === -1) return used > 0 ? `${used.toLocaleString("tr-TR")} / Sınırsız ${unit}` : `Sınırsız ${unit}`;
  return `${used.toLocaleString("tr-TR")} / ${limit.toLocaleString("tr-TR")} ${unit}`;
}

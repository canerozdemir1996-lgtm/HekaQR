// Plan limits and feature gates
// Single source of truth for what each plan allows.
// -1 = unlimited

export type PlanKey = "free" | "starter" | "pro" | "enterprise";
export type SubStatus =
  | "free"
  | "active"
  | "trial"
  | "expired"
  | "cancelled"
  | "paused"
  | "past_due"
  | "unpaid";

export type FeatureAccessKey =
  | "bulk_upload"
  | "api_access"
  | "custom_domain"
  | "tracking_integrations"
  | "webhooks"
  | "advanced_analytics";

export interface PlanLimits {
  max_qr: number;
  bulk_upload: boolean;
  api_access: boolean;
  custom_domain: boolean;
  analytics_days: number;
  org_members: number;
  styles: number;
  /** Aylık tarama limiti. -1 = sınırsız. */
  max_monthly_scans: number;
  /** scan_logs saklama süresi (gün). -1 = sınırsız (silinmez). */
  scan_log_retention_days: number;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    max_qr: 3,
    bulk_upload: false,
    api_access: false,
    custom_domain: false,
    analytics_days: 7,
    org_members: 1,
    styles: 2,
    max_monthly_scans: 500,
    scan_log_retention_days: 30,
  },
  starter: {
    max_qr: 25,
    bulk_upload: true,
    api_access: false,
    custom_domain: false,
    analytics_days: 30,
    org_members: 3,
    styles: 10,
    max_monthly_scans: 1500,
    scan_log_retention_days: -1,
  },
  pro: {
    max_qr: 100,
    bulk_upload: true,
    api_access: true,
    custom_domain: true,
    analytics_days: 90,
    org_members: 15,
    styles: -1,
    max_monthly_scans: -1,
    scan_log_retention_days: -1,
  },
  enterprise: {
    max_qr: -1,
    bulk_upload: true,
    api_access: true,
    custom_domain: true,
    analytics_days: 365,
    org_members: -1,
    styles: -1,
    max_monthly_scans: -1,
    scan_log_retention_days: -1,
  },
};

export const PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  free: "Ücretsiz",
  active: "Aktif",
  trial: "Deneme",
  expired: "Süresi Doldu",
  cancelled: "İptal Edildi",
  paused: "Duraklatıldı",
  past_due: "Ödeme Bekleniyor",
  unpaid: "Ödeme Başarısız",
};

export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizePlan(val: string | null | undefined): PlanKey {
  if (val === "starter" || val === "pro" || val === "enterprise") return val;
  return "free";
}

export function normalizeStatus(val: string | null | undefined): SubStatus {
  if (
    val === "active"
    || val === "trial"
    || val === "expired"
    || val === "cancelled"
    || val === "paused"
    || val === "past_due"
    || val === "unpaid"
  ) {
    return val;
  }
  return "free";
}

export function getLimits(plan: PlanKey): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function isWithinGrace(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expired = new Date(expiresAt).getTime();
  return Date.now() - expired < GRACE_PERIOD_MS;
}

function hasFutureWindow(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function canCreateQR(status: SubStatus, plan: PlanKey, expiresAt?: string | null): boolean {
  if (status === "free" || status === "active" || status === "trial") return true;
  if (status === "cancelled") return hasFutureWindow(expiresAt);
  if (status === "past_due") return hasFutureWindow(expiresAt) || isWithinGrace(expiresAt);
  if (status === "expired") return isWithinGrace(expiresAt);
  if (status === "paused" || status === "unpaid") return false;
  return false;
}

export function isPaidAndActive(status: SubStatus, plan: PlanKey, expiresAt?: string | null): boolean {
  if (plan === "free") return false;
  if (status === "active" || status === "trial") return true;
  if (status === "cancelled") return hasFutureWindow(expiresAt);
  if (status === "past_due") return hasFutureWindow(expiresAt) || isWithinGrace(expiresAt);
  if (status === "expired") return isWithinGrace(expiresAt);
  if (status === "paused" || status === "unpaid") return false;
  return false;
}

export function hasFeatureAccess(
  plan: PlanKey,
  status: SubStatus,
  feature: FeatureAccessKey,
  expiresAt?: string | null,
): boolean {
  if (!isPaidAndActive(status, plan, expiresAt)) return false;

  const limits = getLimits(plan);
  switch (feature) {
    case "bulk_upload":
      return limits.bulk_upload;
    case "api_access":
      return limits.api_access;
    case "custom_domain":
      return limits.custom_domain;
    case "tracking_integrations":
      return plan === "pro" || plan === "enterprise";
    case "webhooks":
      return plan === "pro" || plan === "enterprise";
    case "advanced_analytics":
      return plan === "pro" || plan === "enterprise";
    default:
      return false;
  }
}

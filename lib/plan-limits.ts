// Plan limits and feature gates
// Single source of truth for what each plan allows.
// -1 = unlimited

export type PlanKey = "free" | "starter" | "pro" | "enterprise" | "vip";
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
  /** Menü QR alt limiti. -1 = ayrı bir alt limit yok (yalnızca max_qr geçerli). */
  max_menu_qr: number;
  /** vCard / Multi URL alt limiti. -1 = ayrı bir alt limit yok. */
  max_vcard_pages: number;
  /** White-label domain adedi. -1 = sınırsız (feature gate ayrıca geçerli). */
  max_white_label_domains: number;
}

// max_menu_qr / max_vcard_pages / max_white_label_domains default to -1 on every
// static tier: these per-type caps are only enforced for Enterprise customers
// via their purchased snapshot (applyEnterpriseLimits). -1 means "no extra
// sub-limit" so Free/Starter/Pro/VIP behaviour is unchanged.
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
    max_menu_qr: -1,
    max_vcard_pages: -1,
    max_white_label_domains: -1,
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
    max_menu_qr: -1,
    max_vcard_pages: -1,
    max_white_label_domains: -1,
  },
  pro: {
    max_qr: 150,
    bulk_upload: true,
    api_access: true,
    custom_domain: true,
    analytics_days: 90,
    org_members: 15,
    styles: -1,
    max_monthly_scans: -1,
    scan_log_retention_days: -1,
    max_menu_qr: -1,
    max_vcard_pages: -1,
    max_white_label_domains: -1,
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
    max_menu_qr: -1,
    max_vcard_pages: -1,
    max_white_label_domains: -1,
  },
  vip: {
    max_qr: -1,
    bulk_upload: true,
    api_access: true,
    custom_domain: true,
    analytics_days: 365,
    org_members: -1,
    styles: -1,
    max_monthly_scans: -1,
    scan_log_retention_days: -1,
    max_menu_qr: -1,
    max_vcard_pages: -1,
    max_white_label_domains: -1,
  },
};

/**
 * Per-user Enterprise entitlement snapshot, written on a successful self-serve
 * Enterprise checkout from the slider configuration the customer paid for.
 * Stored on `user_settings.enterprise_limits` (jsonb). Only the metrics the
 * enforcement engine currently understands are applied as hard caps; the rest
 * are kept for record/visibility and future enforcement.
 */
export interface EnterpriseLimitsSnapshot {
  dynamicQr?: number;
  menuQr?: number;
  vcardPages?: number;
  monthlyScans?: number;
  teamMembers?: number;
  whiteLabelDomains?: number;
  quote_id?: string;
  billing_preference?: string;
  updated_at?: string;
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * Overlays a paid Enterprise snapshot onto the static Enterprise tier limits.
 * Maps the three enforceable slider metrics onto their PlanLimits fields and
 * leaves everything else at the Enterprise default (unlimited). Returns `base`
 * unchanged when there is no snapshot — so admin/VIP-granted Enterprise without
 * a purchase stays unlimited, and Free/Starter/Pro are never touched.
 */
export function applyEnterpriseLimits(
  base: PlanLimits,
  snapshot: EnterpriseLimitsSnapshot | null | undefined,
): PlanLimits {
  if (!snapshot) return base;
  const next: PlanLimits = { ...base };

  const dynamicQr = positiveInt(snapshot.dynamicQr);
  const menuQr = positiveInt(snapshot.menuQr);
  const vcardPages = positiveInt(snapshot.vcardPages);

  // Every QR type (dynamic, menu, vCard/Multi URL) is a row in qr_codes and each
  // slider was priced separately, so total capacity is the sum of the purchased
  // per-type budgets. The per-type sub-caps below then bound each subset.
  const totalQr = (dynamicQr ?? 0) + (menuQr ?? 0) + (vcardPages ?? 0);
  if (totalQr > 0) next.max_qr = totalQr;
  if (menuQr !== null) next.max_menu_qr = menuQr;
  if (vcardPages !== null) next.max_vcard_pages = vcardPages;

  const monthlyScans = positiveInt(snapshot.monthlyScans);
  if (monthlyScans !== null) next.max_monthly_scans = monthlyScans;

  const teamMembers = positiveInt(snapshot.teamMembers);
  if (teamMembers !== null) next.org_members = teamMembers;

  const whiteLabelDomains = positiveInt(snapshot.whiteLabelDomains);
  if (whiteLabelDomains !== null) next.max_white_label_domains = whiteLabelDomains;

  return next;
}

export const PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
  vip: "VIP",
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
  if (val === "starter" || val === "pro" || val === "enterprise" || val === "vip") return val;
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
      return plan === "pro" || plan === "enterprise" || plan === "vip";
    case "webhooks":
      return plan === "pro" || plan === "enterprise" || plan === "vip";
    case "advanced_analytics":
      return plan === "pro" || plan === "enterprise" || plan === "vip";
    default:
      return false;
  }
}

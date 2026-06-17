// ─── Plan Limits & Feature Gates ─────────────────────────────────────────────
// Single source of truth for what each plan allows.
// -1 = unlimited

export type PlanKey = "free" | "starter" | "pro" | "enterprise";
export type SubStatus = "free" | "active" | "trial" | "expired" | "cancelled";

export interface PlanLimits {
  max_qr: number;           // -1 = unlimited
  bulk_upload: boolean;
  api_access: boolean;
  custom_domain: boolean;
  analytics_days: number;   // how many days back analytics shows
  org_members: number;      // -1 = unlimited
  styles: number;           // saved QR styles, -1 = unlimited
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    max_qr:        3,
    bulk_upload:   false,
    api_access:    false,
    custom_domain: false,
    analytics_days: 7,
    org_members:   1,
    styles:        2,
  },
  starter: {
    max_qr:        25,
    bulk_upload:   true,
    api_access:    false,
    custom_domain: false,
    analytics_days: 30,
    org_members:   3,
    styles:        10,
  },
  pro: {
    max_qr:        100,
    bulk_upload:   true,
    api_access:    true,
    custom_domain: true,
    analytics_days: 90,
    org_members:   15,
    styles:        -1,
  },
  enterprise: {
    max_qr:        -1,
    bulk_upload:   true,
    api_access:    true,
    custom_domain: true,
    analytics_days: 365,
    org_members:   -1,
    styles:        -1,
  },
};

export const PLAN_LABEL: Record<PlanKey, string> = {
  free:       "Free",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
};

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  free:      "Ücretsiz",
  active:    "Aktif",
  trial:     "Deneme",
  expired:   "Süresi Doldu",
  cancelled: "İptal Edildi",
};

// Grace period after expiry before hard-blocking creation (in ms)
export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function normalizePlan(val: string | null | undefined): PlanKey {
  if (val === "starter" || val === "pro" || val === "enterprise") return val;
  return "free";
}

export function normalizeStatus(val: string | null | undefined): SubStatus {
  if (val === "active" || val === "trial" || val === "expired" || val === "cancelled") return val;
  return "free";
}

export function getLimits(plan: PlanKey): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// Returns true if the user is within a paid/active window (including grace period)
export function isWithinGrace(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expired = new Date(expiresAt).getTime();
  return Date.now() - expired < GRACE_PERIOD_MS;
}

// Can the user create new QR codes?
export function canCreateQR(status: SubStatus, plan: PlanKey, expiresAt?: string | null): boolean {
  if (status === "free" || status === "active" || status === "trial") return true;
  if (status === "expired") return isWithinGrace(expiresAt);
  if (status === "cancelled") return false;
  return false;
}

// Is this subscription currently "blocking" paid features?
export function isPaidAndActive(status: SubStatus, plan: PlanKey, expiresAt?: string | null): boolean {
  if (plan === "free") return false;
  if (status === "active" || status === "trial") return true;
  if (status === "expired") return isWithinGrace(expiresAt);
  return false;
}

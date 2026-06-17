// ─── Server-side plan enforcement ────────────────────────────────────────────
// Use in API routes to gate features and enforce limits.

import { sbAdmin } from "@/lib/server/api-helpers";
import {
  normalizePlan, normalizeStatus, getLimits, canCreateQR,
  type PlanKey, type SubStatus, type PlanLimits,
  GRACE_PERIOD_MS,
} from "@/lib/plan-limits";

export interface UserPlanInfo {
  plan: PlanKey;
  status: SubStatus;
  expires_at: string | null;
  limits: PlanLimits;
  qr_count: number;
  can_create_qr: boolean;
  at_qr_limit: boolean;
}

// Auto-expire: if plan_expires_at is in the past and status is still 'active'/'trial',
// update it to 'expired' in the DB and return the corrected status.
async function autoExpireIfNeeded(
  userId: string,
  status: SubStatus,
  expiresAt: string | null,
): Promise<SubStatus> {
  if ((status === "active" || status === "trial") && expiresAt) {
    const isExpired = new Date(expiresAt).getTime() < Date.now();
    if (isExpired) {
      const sb = sbAdmin();
      await sb
        .from("user_settings")
        .update({ subscription_status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .then((r) => r, () => null);
      return "expired";
    }
  }
  return status;
}

export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
  const sb = sbAdmin();

  const [settingsRes, qrCountRes] = await Promise.all([
    sb.from("user_settings")
      .select("current_plan, subscription_status, plan_expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const raw = settingsRes.data;
  let plan = normalizePlan(raw?.current_plan);
  let status = normalizeStatus(raw?.subscription_status);
  const expiresAt = raw?.plan_expires_at ?? null;
  const qrCount = qrCountRes.count ?? 0;

  // Auto-correct expired plans
  status = await autoExpireIfNeeded(userId, status, expiresAt);

  const limits = getLimits(plan);
  const canCreate = canCreateQR(status, plan, expiresAt);
  const atLimit = limits.max_qr !== -1 && qrCount >= limits.max_qr;

  return {
    plan,
    status,
    expires_at: expiresAt,
    limits,
    qr_count: qrCount,
    can_create_qr: canCreate && !atLimit,
    at_qr_limit: atLimit,
  };
}

// Throws a structured error if user cannot create a QR code.
// Call this at the top of POST /api/v1/qrcodes.
export async function assertCanCreateQR(userId: string): Promise<UserPlanInfo> {
  const info = await getUserPlan(userId);

  if (!info.can_create_qr) {
    if (info.status === "cancelled") {
      throw Object.assign(
        new Error("Aboneliğiniz iptal edildi. QR kodu oluşturmak için planınızı yenileyin."),
        { code: "SUBSCRIPTION_CANCELLED", planInfo: info }
      );
    }
    if (info.status === "expired") {
      throw Object.assign(
        new Error("Plan süreniz doldu. QR kodu oluşturmak için planınızı yenileyin."),
        { code: "SUBSCRIPTION_EXPIRED", planInfo: info }
      );
    }
  }

  if (info.at_qr_limit) {
    throw Object.assign(
      new Error(
        `${info.plan.charAt(0).toUpperCase() + info.plan.slice(1)} planı maksimum ${info.limits.max_qr} QR koduna izin veriyor. Daha fazlası için planınızı yükseltin.`
      ),
      { code: "QR_LIMIT_REACHED", planInfo: info }
    );
  }

  return info;
}

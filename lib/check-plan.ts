// Server-side plan enforcement
// Use in API routes to gate features and enforce limits.

import { sbAdmin } from "@/lib/server/api-helpers";
import {
  canCreateQR,
  getLimits,
  hasFeatureAccess,
  isPaidAndActive,
  normalizePlan,
  normalizeStatus,
  GRACE_PERIOD_MS,
  type FeatureAccessKey,
  type PlanKey,
  type PlanLimits,
  type SubStatus,
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

async function autoExpireIfNeeded(
  userId: string,
  status: SubStatus,
  expiresAt: string | null,
): Promise<SubStatus> {
  if ((status === "active" || status === "trial" || status === "past_due") && expiresAt) {
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
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);

  const raw = settingsRes.data;
  const plan = normalizePlan(raw?.current_plan);
  let status = normalizeStatus(raw?.subscription_status);
  const expiresAt = raw?.plan_expires_at ?? null;
  const qrCount = qrCountRes.count ?? 0;

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

export async function assertCanCreateQR(userId: string): Promise<UserPlanInfo> {
  const info = await getUserPlan(userId);

  if (!info.can_create_qr) {
    if (info.status === "cancelled") {
      throw Object.assign(
        new Error("Aboneliğiniz iptal edildi. QR kodu oluşturmak için planı yenileyin."),
        { code: "SUBSCRIPTION_CANCELLED", planInfo: info },
      );
    }
    if (info.status === "expired") {
      throw Object.assign(
        new Error("Plan süreniz doldu. QR kodu oluşturmak için planı yenileyin."),
        { code: "SUBSCRIPTION_EXPIRED", planInfo: info },
      );
    }
    if (info.status === "past_due" || info.status === "unpaid") {
      throw Object.assign(
        new Error("Ödemeniz bekleniyor. QR oluşturmaya devam etmek için ödeme yönteminizi güncelleyin."),
        { code: "SUBSCRIPTION_PAYMENT_REQUIRED", planInfo: info },
      );
    }
    if (info.status === "paused") {
      throw Object.assign(
        new Error("Aboneliğiniz duraklatıldı. Devam etmek için aboneliği yeniden etkinleştirin."),
        { code: "SUBSCRIPTION_PAUSED", planInfo: info },
      );
    }
  }

  if (info.at_qr_limit) {
    throw Object.assign(
      new Error(
        `${info.plan.charAt(0).toUpperCase() + info.plan.slice(1)} planı maksimum ${info.limits.max_qr} QR koduna izin veriyor. Daha fazlası için planı yükseltin.`,
      ),
      { code: "QR_LIMIT_REACHED", planInfo: info },
    );
  }

  return info;
}

export async function getCurrentPlan(userId: string) {
  const info = await getUserPlan(userId);
  return {
    plan: info.plan,
    status: info.status,
    expires_at: info.expires_at,
  };
}

export async function hasActiveSubscription(userId: string) {
  const info = await getUserPlan(userId);
  return isPaidAndActive(info.status, info.plan, info.expires_at);
}

export async function canAccessFeature(userId: string, feature: FeatureAccessKey) {
  const info = await getUserPlan(userId);
  return hasFeatureAccess(info.plan, info.status, feature, info.expires_at);
}

export { GRACE_PERIOD_MS };

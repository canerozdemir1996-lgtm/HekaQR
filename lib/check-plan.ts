// Server-side plan enforcement
// Use in API routes to gate features and enforce limits.

import { sbAdmin } from "@/lib/server/api-helpers";
import {
  applyEnterpriseLimits,
  canCreateQR,
  getLimits,
  hasFeatureAccess,
  isPaidAndActive,
  normalizePlan,
  normalizeStatus,
  GRACE_PERIOD_MS,
  type EnterpriseLimitsSnapshot,
  type FeatureAccessKey,
  type PlanKey,
  type PlanLimits,
  type SubStatus,
} from "@/lib/plan-limits";
import { consumeMonthlyPlanUsage } from "@/lib/plan-usage";

export interface UserPlanInfo {
  plan: PlanKey;
  entitlement_plan: PlanKey;
  status: SubStatus;
  expires_at: string | null;
  license_key: string | null;
  license_plan: PlanKey | null;
  license_type: string | null;
  limits: PlanLimits;
  qr_count: number;
  can_create_qr: boolean;
  at_qr_limit: boolean;
}

type RawPlanSettings = {
  current_plan?: string | null;
  subscription_status?: string | null;
  plan_expires_at?: string | null;
  license_key?: string | null;
  license_plan?: string | null;
  license_type?: string | null;
  enterprise_limits?: EnterpriseLimitsSnapshot | null;
};

function normalizeEnterpriseSnapshot(value: unknown): EnterpriseLimitsSnapshot | null {
  return value && typeof value === "object" ? (value as EnterpriseLimitsSnapshot) : null;
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

async function loadPlanSettings(userId: string): Promise<RawPlanSettings | null> {
  const sb = sbAdmin();
  const withLicense = await sb.from("user_settings")
    .select("current_plan, subscription_status, plan_expires_at, license_key, license_plan, license_type, enterprise_limits")
    .eq("user_id", userId)
    .maybeSingle();

  if (!withLicense.error) return withLicense.data as RawPlanSettings | null;

  const fallback = await sb.from("user_settings")
    .select("current_plan, subscription_status, plan_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  return (fallback.data as RawPlanSettings | null) ?? null;
}

export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
  const sb = sbAdmin();

  const [settingsRes, qrCountRes] = await Promise.all([
    loadPlanSettings(userId),
    sb.from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);

  const raw = settingsRes;
  const plan = normalizePlan(raw?.current_plan);
  const licensePlan = normalizePlan(raw?.license_plan);
  const entitlementPlan = plan === "vip" && licensePlan !== "free" && licensePlan !== "vip"
    ? licensePlan
    : plan;
  let status = normalizeStatus(raw?.subscription_status);
  const expiresAt = raw?.plan_expires_at ?? null;
  const qrCount = qrCountRes.count ?? 0;

  status = await autoExpireIfNeeded(userId, status, expiresAt);

  const baseLimits = getLimits(entitlementPlan);
  // Enterprise customers are capped at exactly the slider configuration they
  // purchased (snapshotted on checkout); every other plan uses its static tier.
  const limits = entitlementPlan === "enterprise"
    ? applyEnterpriseLimits(baseLimits, normalizeEnterpriseSnapshot(raw?.enterprise_limits))
    : baseLimits;
  const canCreate = canCreateQR(status, entitlementPlan, expiresAt);
  const atLimit = limits.max_qr !== -1 && qrCount >= limits.max_qr;

  return {
    plan,
    entitlement_plan: entitlementPlan,
    status,
    expires_at: expiresAt,
    license_key: raw?.license_key ?? null,
    license_plan: plan === "vip" && licensePlan !== "free" && licensePlan !== "vip" ? licensePlan : null,
    license_type: raw?.license_type ?? null,
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

// Per-type Enterprise sub-limits. These are no-ops unless the resolved limit is
// a real number (Enterprise snapshot); every other plan keeps -1 = unlimited,
// so these never fire for Free/Starter/Pro/VIP.

export async function assertCanCreateMenuQr(userId: string, info?: UserPlanInfo): Promise<UserPlanInfo> {
  const planInfo = info ?? await getUserPlan(userId);
  const limit = planInfo.limits.max_menu_qr;
  if (limit === -1) return planInfo;

  const { count, error } = await sbAdmin()
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("qr_type", "menu");
  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limit) {
    throw Object.assign(
      new Error(`Kurumsal paketinizdeki Menü QR limiti (${limit}) doldu. Limiti artırmak için satış ekibiyle görüşün.`),
      { code: "MENU_QR_LIMIT_REACHED", planInfo },
    );
  }
  return planInfo;
}

export async function assertCanCreateVcardPage(userId: string, info?: UserPlanInfo): Promise<UserPlanInfo> {
  const planInfo = info ?? await getUserPlan(userId);
  const limit = planInfo.limits.max_vcard_pages;
  if (limit === -1) return planInfo;

  const { count, error } = await sbAdmin()
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("qr_type", ["vcard", "multi"]);
  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limit) {
    throw Object.assign(
      new Error(`Kurumsal paketinizdeki vCard / Multi URL limiti (${limit}) doldu. Limiti artırmak için satış ekibiyle görüşün.`),
      { code: "VCARD_LIMIT_REACHED", planInfo },
    );
  }
  return planInfo;
}

export async function assertCanCreateCustomDomain(userId: string, info?: UserPlanInfo): Promise<UserPlanInfo> {
  const planInfo = info ?? await getUserPlan(userId);
  const limit = planInfo.limits.max_white_label_domains;
  if (limit === -1) return planInfo;

  const { count, error } = await sbAdmin()
    .from("custom_domains")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limit) {
    throw Object.assign(
      new Error(`Kurumsal paketinizdeki white-label domain limiti (${limit}) doldu. Limiti artırmak için satış ekibiyle görüşün.`),
      { code: "DOMAIN_LIMIT_REACHED", planInfo },
    );
  }
  return planInfo;
}

export async function assertCanCreateFolder(userId: string, info?: UserPlanInfo): Promise<UserPlanInfo> {
  const planInfo = info ?? await getUserPlan(userId);
  const limit = planInfo.limits.max_folders;
  if (limit === null) return planInfo;

  const { count, error } = await sbAdmin()
    .from("qr_folders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= limit) {
    throw Object.assign(
      new Error(`Planınızdaki klasör limiti (${limit}) doldu.`),
      { code: "FOLDER_LIMIT_REACHED", planInfo },
    );
  }
  return planInfo;
}

export interface OrganizationSeatUsageOptions {
  includePendingInvites?: boolean;
  excludeInviteEmail?: string;
}

export interface OrganizationSeatUsage {
  activeMembers: number;
  pendingInvites: number;
  usedSeats: number;
}

export async function getOrganizationSeatUsage(
  organizationId: string,
  options: OrganizationSeatUsageOptions = {},
): Promise<OrganizationSeatUsage> {
  const sb = sbAdmin();
  const activeMembersQuery = sb
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("org_id", organizationId)
    .eq("status", "active");

  let pendingInvitesQuery = sb
    .from("organization_invites")
    .select("id", { count: "exact", head: true })
    .eq("org_id", organizationId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  const excludedEmail = options.excludeInviteEmail?.trim().toLowerCase();
  if (excludedEmail) pendingInvitesQuery = pendingInvitesQuery.neq("email", excludedEmail);

  const [activeMembersResult, pendingInvitesResult] = await Promise.all([
    activeMembersQuery,
    options.includePendingInvites
      ? pendingInvitesQuery
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (activeMembersResult.error) throw new Error(activeMembersResult.error.message);
  if (pendingInvitesResult.error) throw new Error(pendingInvitesResult.error.message);

  const activeMembers = activeMembersResult.count ?? 0;
  const pendingInvites = pendingInvitesResult.count ?? 0;
  return {
    activeMembers,
    pendingInvites,
    usedSeats: activeMembers + pendingInvites,
  };
}

export async function assertCanAddOrganizationMember(
  ownerId: string,
  organizationId: string,
  options: OrganizationSeatUsageOptions = {},
): Promise<UserPlanInfo> {
  const planInfo = await getUserPlan(ownerId);
  const limit = planInfo.limits.org_members;
  if (limit === -1) return planInfo;
  const usage = await getOrganizationSeatUsage(organizationId, options);
  if (usage.usedSeats >= limit) {
    throw Object.assign(new Error(`Planınızdaki ekip üyesi limiti (${limit}) doldu.`), {
      code: "TEAM_SEAT_LIMIT_REACHED",
      planInfo,
    });
  }
  return planInfo;
}

export async function getCurrentPlan(userId: string) {
  const info = await getUserPlan(userId);
  return {
    plan: info.plan,
    entitlement_plan: info.entitlement_plan,
    status: info.status,
    expires_at: info.expires_at,
  };
}

export async function hasActiveSubscription(userId: string) {
  const info = await getUserPlan(userId);
  return isPaidAndActive(info.status, info.entitlement_plan, info.expires_at);
}

export async function canAccessFeature(userId: string, feature: FeatureAccessKey) {
  const info = await getUserPlan(userId);
  return hasFeatureAccess(info.entitlement_plan, info.status, feature, info.expires_at);
}

/** API-key requests only: validates feature grant and reserves one request. */
export async function assertCanUseApi(userId: string): Promise<UserPlanInfo> {
  const info = await getUserPlan(userId);
  if (!hasFeatureAccess(info.entitlement_plan, info.status, "api_access", info.expires_at)) {
    throw Object.assign(new Error("API erişimi mevcut planınızda yok."), { code: "API_ACCESS_DENIED", planInfo: info });
  }
  const accepted = await consumeMonthlyPlanUsage(userId, "api_request", info.limits.max_api_requests_per_month);
  if (!accepted) {
    throw Object.assign(new Error("Aylık API istek kotanız doldu."), { code: "API_REQUEST_LIMIT_REACHED", planInfo: info });
  }
  return info;
}

export { GRACE_PERIOD_MS };

import type { BillingCycle, PlanKey } from "@/lib/pricing";

export type PaidPlanKey = Extract<PlanKey, "starter" | "pro" | "enterprise">;
// Plans sold through the standard fixed-price in-dashboard checkout
// (POST /api/billing/checkout). Enterprise is intentionally NOT here — it is
// priced per-configuration and can only be bought through the Enterprise quote
// route, which sets a server-computed `custom_price`.
export type StandardCheckoutPlanKey =
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly";
// Enterprise checkout keys exist so the webhook can resolve an Enterprise
// subscription back to a plan (via custom_data.plan_key or its variant id),
// but they are deliberately excluded from the standard checkout guard above.
export type EnterpriseCheckoutPlanKey = "enterprise_monthly" | "enterprise_yearly";
export type CheckoutPlanKey = StandardCheckoutPlanKey | EnterpriseCheckoutPlanKey;

type CheckoutPlanMeta = {
  plan: PaidPlanKey;
  billing: BillingCycle;
  variantEnvKey: string;
};

const CHECKOUT_PLAN_META: Record<CheckoutPlanKey, CheckoutPlanMeta> = {
  starter_monthly: {
    plan: "starter",
    billing: "monthly",
    variantEnvKey: "LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID",
  },
  starter_yearly: {
    plan: "starter",
    billing: "yearly",
    variantEnvKey: "LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID",
  },
  pro_monthly: {
    plan: "pro",
    billing: "monthly",
    variantEnvKey: "LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID",
  },
  pro_yearly: {
    plan: "pro",
    billing: "yearly",
    variantEnvKey: "LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID",
  },
  enterprise_monthly: {
    plan: "enterprise",
    billing: "monthly",
    variantEnvKey: "LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID",
  },
  enterprise_yearly: {
    plan: "enterprise",
    billing: "yearly",
    variantEnvKey: "LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID",
  },
};

const STANDARD_CHECKOUT_PLAN_KEYS: readonly StandardCheckoutPlanKey[] = [
  "starter_monthly",
  "starter_yearly",
  "pro_monthly",
  "pro_yearly",
];

export const CHECKOUT_PLAN_KEYS = Object.keys(CHECKOUT_PLAN_META) as CheckoutPlanKey[];

export function isCheckoutPlanKey(value: string | null | undefined): value is CheckoutPlanKey {
  return Boolean(value && value in CHECKOUT_PLAN_META);
}

// Guard for the standard fixed-price checkout. Enterprise keys are rejected here
// so an Enterprise variant can never be charged at its bare variant price
// (bypassing the per-configuration custom_price computed server-side).
export function isStandardCheckoutPlanKey(
  value: string | null | undefined,
): value is StandardCheckoutPlanKey {
  return Boolean(value && (STANDARD_CHECKOUT_PLAN_KEYS as readonly string[]).includes(value));
}

export function buildCheckoutPlanKey(
  plan: string | null | undefined,
  billing: BillingCycle,
): CheckoutPlanKey | null {
  if ((plan === "starter" || plan === "pro") && isCheckoutPlanKey(`${plan}_${billing}`)) {
    return `${plan}_${billing}`;
  }
  return null;
}

export function getCheckoutPlanMeta(planKey: CheckoutPlanKey) {
  return CHECKOUT_PLAN_META[planKey];
}

export function resolveVariantId(
  planKey: CheckoutPlanKey,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envKey = CHECKOUT_PLAN_META[planKey].variantEnvKey;
  const value = env[envKey]?.trim();
  if (!value) {
    throw new Error(`Missing billing variant configuration: ${envKey}`);
  }
  return value;
}

export function findCheckoutPlanKeyByVariantId(
  variantId: string | number | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutPlanKey | null {
  if (variantId === null || variantId === undefined) return null;
  const normalized = String(variantId);
  for (const [planKey, meta] of Object.entries(CHECKOUT_PLAN_META) as Array<[CheckoutPlanKey, CheckoutPlanMeta]>) {
    if (env[meta.variantEnvKey]?.trim() === normalized) {
      return planKey;
    }
  }
  return null;
}

import type { BillingCycle, PlanKey } from "@/lib/pricing";

export type PaidPlanKey = Extract<PlanKey, "starter" | "pro">;
export type CheckoutPlanKey =
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly";

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
};

export const CHECKOUT_PLAN_KEYS = Object.keys(CHECKOUT_PLAN_META) as CheckoutPlanKey[];

export function isCheckoutPlanKey(value: string | null | undefined): value is CheckoutPlanKey {
  return Boolean(value && value in CHECKOUT_PLAN_META);
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

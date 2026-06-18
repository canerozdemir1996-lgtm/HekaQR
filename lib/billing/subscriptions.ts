import { sbAdmin } from "@/lib/server/api-helpers";
import {
  findCheckoutPlanKeyByVariantId,
  getCheckoutPlanMeta,
  isCheckoutPlanKey,
  type CheckoutPlanKey,
} from "@/lib/billing/plans";
import type { BillingCycle, PlanKey } from "@/lib/pricing";

export type InternalSubscriptionStatus =
  | "free"
  | "active"
  | "trial"
  | "expired"
  | "cancelled"
  | "paused"
  | "past_due"
  | "unpaid";

export function normalizeLemonStatus(status: string | null | undefined): InternalSubscriptionStatus {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return "active";
    case "on_trial":
      return "trial";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "paused":
      return "paused";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    default:
      return "free";
  }
}

export function resolveCheckoutPlanKey(input: {
  explicitPlanKey?: string | null;
  variantId?: string | number | null;
  existingPlanKey?: string | null;
}): CheckoutPlanKey | null {
  if (isCheckoutPlanKey(input.explicitPlanKey)) {
    return input.explicitPlanKey;
  }
  const fromVariant = findCheckoutPlanKeyByVariantId(input.variantId);
  if (fromVariant) {
    return fromVariant;
  }
  return isCheckoutPlanKey(input.existingPlanKey) ? input.existingPlanKey : null;
}

export function resolvePlanExpiresAt(input: {
  status: InternalSubscriptionStatus;
  renewsAt?: string | null;
  endsAt?: string | null;
  trialEndsAt?: string | null;
}) {
  if (input.status === "trial") return input.trialEndsAt ?? input.renewsAt ?? null;
  if (input.status === "cancelled" || input.status === "expired") return input.endsAt ?? input.renewsAt ?? null;
  if (input.status === "active" || input.status === "past_due") return input.renewsAt ?? input.endsAt ?? null;
  if (input.status === "paused" || input.status === "unpaid") return input.endsAt ?? input.renewsAt ?? null;
  return null;
}

export function planFromCheckoutKey(planKey: CheckoutPlanKey | null): {
  currentPlan: PlanKey;
  billingCycle: BillingCycle;
} {
  if (!planKey) {
    return { currentPlan: "free", billingCycle: "monthly" };
  }
  const meta = getCheckoutPlanMeta(planKey);
  return {
    currentPlan: meta.plan,
    billingCycle: meta.billing,
  };
}

export async function getLatestSubscriptionForUser(userId: string) {
  const { data, error } = await sbAdmin()
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "lemon_squeezy")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertSubscriptionRecord(input: {
  userId: string;
  providerSubscriptionId: string;
  providerCustomerId?: string | null;
  providerOrderId?: string | null;
  providerProductId?: string | null;
  providerVariantId?: string | null;
  explicitPlanKey?: string | null;
  status: InternalSubscriptionStatus;
  renewsAt?: string | null;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  cancelledAt?: string | null;
  amount?: number | null;
  currency?: string | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  paymentProcessor?: string | null;
  pause?: Record<string, unknown> | null;
  updatePaymentMethodUrl?: string | null;
  customerPortalUrl?: string | null;
  providerCreatedAt?: string | null;
  providerUpdatedAt?: string | null;
  testMode?: boolean | null;
}) {
  const sb = sbAdmin();
  const { data: existing, error: existingError } = await sb
    .from("subscriptions")
    .select("id, user_id, plan_key, amount, currency")
    .eq("provider", "lemon_squeezy")
    .eq("provider_subscription_id", input.providerSubscriptionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const checkoutPlanKey = resolveCheckoutPlanKey({
    explicitPlanKey: input.explicitPlanKey,
    variantId: input.providerVariantId,
    existingPlanKey: existing?.plan_key as string | null | undefined,
  });

  if (!checkoutPlanKey) {
    throw new Error("Billing plan could not be resolved from Lemon Squeezy payload.");
  }

  const { currentPlan, billingCycle } = planFromCheckoutKey(checkoutPlanKey);
  const planExpiresAt = resolvePlanExpiresAt({
    status: input.status,
    renewsAt: input.renewsAt,
    endsAt: input.endsAt,
    trialEndsAt: input.trialEndsAt,
  });

  const subscriptionRow = {
    user_id: input.userId || existing?.user_id,
    provider: "lemon_squeezy",
    provider_subscription_id: input.providerSubscriptionId,
    provider_customer_id: input.providerCustomerId ?? null,
    provider_order_id: input.providerOrderId ?? null,
    provider_product_id: input.providerProductId ?? null,
    provider_variant_id: input.providerVariantId ?? null,
    plan_key: checkoutPlanKey,
    status: input.status,
    billing_interval: billingCycle,
    currency: input.currency ?? existing?.currency ?? null,
    amount: input.amount ?? existing?.amount ?? null,
    renews_at: input.renewsAt ?? null,
    ends_at: input.endsAt ?? null,
    trial_ends_at: input.trialEndsAt ?? null,
    cancelled_at: input.cancelledAt ?? null,
    provider_created_at: input.providerCreatedAt ?? null,
    provider_updated_at: input.providerUpdatedAt ?? null,
    card_brand: input.cardBrand ?? null,
    card_last_four: input.cardLastFour ?? null,
    payment_processor: input.paymentProcessor ?? null,
    pause: input.pause ?? null,
    update_payment_method_url: input.updatePaymentMethodUrl ?? null,
    customer_portal_url: input.customerPortalUrl ?? null,
    test_mode: Boolean(input.testMode),
    updated_at: new Date().toISOString(),
  };

  const { error: subscriptionError } = await sb
    .from("subscriptions")
    .upsert(subscriptionRow, { onConflict: "provider,provider_subscription_id" });

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const { error: settingsError } = await sb
    .from("user_settings")
    .upsert({
      user_id: input.userId,
      current_plan: currentPlan,
      billing_cycle: billingCycle,
      subscription_status: input.status,
      plan_expires_at: planExpiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  return {
    currentPlan,
    billingCycle,
    status: input.status,
    planExpiresAt,
    checkoutPlanKey,
  };
}

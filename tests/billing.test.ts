import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutPlanKey, findCheckoutPlanKeyByVariantId, resolveVariantId } from "../lib/billing/plans";
import { verifyLemonSignature } from "../lib/billing/lemon-squeezy";
import {
  normalizeLemonStatus,
  resolveInvoiceDrivenStatus,
  resolveLifecycleStatus,
  resolvePlanExpiresAt,
} from "../lib/billing/subscription-state";
import { resolveCheckoutPlanKey } from "../lib/billing/subscriptions";

test("buildCheckoutPlanKey only allows starter and pro paid combinations", () => {
  assert.equal(buildCheckoutPlanKey("starter", "monthly"), "starter_monthly");
  assert.equal(buildCheckoutPlanKey("pro", "yearly"), "pro_yearly");
  assert.equal(buildCheckoutPlanKey("free", "monthly"), null);
  assert.equal(buildCheckoutPlanKey("enterprise", "yearly"), null);
});

test("variant ids are resolved from server-side env only", () => {
  const env = {
    LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID: "101",
    LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID: "102",
    LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID: "201",
    LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID: "202",
  } as unknown as NodeJS.ProcessEnv;

  assert.equal(resolveVariantId("starter_yearly", env), "102");
  assert.equal(findCheckoutPlanKeyByVariantId("202", env), "pro_yearly");
  assert.equal(findCheckoutPlanKeyByVariantId("999", env), null);
});

test("lemon statuses are normalized to internal plan states", () => {
  assert.equal(normalizeLemonStatus("active"), "active");
  assert.equal(normalizeLemonStatus("on_trial"), "trial");
  assert.equal(normalizeLemonStatus("past_due"), "past_due");
  assert.equal(normalizeLemonStatus("paused"), "paused");
  assert.equal(normalizeLemonStatus("unknown"), "free");
});

test("plan expiry chooses the correct access window", () => {
  assert.equal(
    resolvePlanExpiresAt({
      status: "trial",
      trialEndsAt: "2026-07-01T00:00:00.000Z",
    }),
    "2026-07-01T00:00:00.000Z",
  );

  assert.equal(
    resolvePlanExpiresAt({
      status: "cancelled",
      endsAt: "2026-08-01T00:00:00.000Z",
    }),
    "2026-08-01T00:00:00.000Z",
  );
});

test("invalid webhook signatures are rejected and valid ones pass", async () => {
  const previous = {
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  };

  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "billing-secret";

  const rawBody = JSON.stringify({ ok: true, id: "sub_1" });
  const crypto = await import("node:crypto");
  const validSignature = crypto.createHmac("sha256", "billing-secret").update(rawBody).digest("hex");

  assert.equal(verifyLemonSignature(rawBody, validSignature), true);
  assert.equal(verifyLemonSignature(rawBody, "wrong-signature"), false);

  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = previous.webhookSecret;
});

test("resolveLifecycleStatus: subscription_resumed/unpaused always become active regardless of raw status", () => {
  assert.equal(resolveLifecycleStatus("subscription_resumed", false, "cancelled"), "active");
  assert.equal(resolveLifecycleStatus("subscription_unpaused", true, "paused"), "active");
});

test("resolveLifecycleStatus: subscription_paused and subscription_expired are driven by the event name, not raw status", () => {
  assert.equal(resolveLifecycleStatus("subscription_paused", false, "active"), "paused");
  assert.equal(resolveLifecycleStatus("subscription_expired", false, "active"), "expired");
});

test("resolveLifecycleStatus: subscription_cancelled treats a still-'active' raw status as cancelled when the cancelled flag is set", () => {
  assert.equal(resolveLifecycleStatus("subscription_cancelled", true, "active"), "cancelled");
});

test("resolveLifecycleStatus: subscription_updated passes through the raw status untouched (upgrade/downgrade keep their real status)", () => {
  assert.equal(resolveLifecycleStatus("subscription_updated", false, "active"), "active");
  assert.equal(resolveLifecycleStatus("subscription_updated", false, "past_due"), "past_due");
});

test("resolveInvoiceDrivenStatus: a failed payment is always past_due even if the subscription still looks active", () => {
  assert.equal(resolveInvoiceDrivenStatus("subscription_payment_failed", { cancelled: false, status: "active" }), "past_due");
});

test("resolveInvoiceDrivenStatus: a successful payment on a cancelled-but-still-active-looking subscription resolves to cancelled", () => {
  assert.equal(resolveInvoiceDrivenStatus("subscription_payment_success", { cancelled: true, status: "active" }), "cancelled");
});

test("resolveInvoiceDrivenStatus: a successful payment on a healthy subscription resolves to active", () => {
  assert.equal(resolveInvoiceDrivenStatus("subscription_payment_success", { cancelled: false, status: "active" }), "active");
});

test("resolveCheckoutPlanKey: upgrading from starter to pro is detected from the new variant id, even with an existing plan key", () => {
  const previousEnv = {
    starter: process.env.LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID,
    pro: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
  };
  process.env.LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID = "101";
  process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID = "201";

  const upgraded = resolveCheckoutPlanKey({ variantId: "201", existingPlanKey: "starter_monthly" });
  assert.equal(upgraded, "pro_monthly");

  process.env.LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID = previousEnv.starter;
  process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID = previousEnv.pro;
});

test("resolveCheckoutPlanKey: downgrading from pro to starter is detected the same way", () => {
  const previousEnv = {
    starter: process.env.LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID,
    pro: process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID,
  };
  process.env.LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID = "102";
  process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID = "202";

  const downgraded = resolveCheckoutPlanKey({ variantId: "102", existingPlanKey: "pro_yearly" });
  assert.equal(downgraded, "starter_yearly");

  process.env.LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID = previousEnv.starter;
  process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID = previousEnv.pro;
});

test("resolveCheckoutPlanKey: an explicit plan key from custom_data always wins over the variant id", () => {
  const result = resolveCheckoutPlanKey({ explicitPlanKey: "pro_monthly", variantId: "999", existingPlanKey: "starter_monthly" });
  assert.equal(result, "pro_monthly");
});

test("resolveCheckoutPlanKey: falls back to the existing plan key when the variant id can't be resolved", () => {
  const result = resolveCheckoutPlanKey({ variantId: "unknown-variant", existingPlanKey: "starter_monthly" });
  assert.equal(result, "starter_monthly");
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutPlanKey, findCheckoutPlanKeyByVariantId, resolveVariantId } from "../lib/billing/plans";
import { verifyLemonSignature } from "../lib/billing/lemon-squeezy";
import { normalizeLemonStatus, resolvePlanExpiresAt } from "../lib/billing/subscriptions";

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

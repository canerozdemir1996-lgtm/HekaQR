import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { hashPayload, verifyLemonSignatureDetailed } from "../lib/billing/lemon-squeezy";
import {
  getResourceSchemaForEvent,
  isLemonEventName,
  isOrderEvent,
  isSubscriptionInvoiceEvent,
  isSubscriptionLifecycleEvent,
  lemonWebhookEnvelopeSchema,
  ORDER_EVENTS,
  orderResourceSchema,
  SUBSCRIPTION_INVOICE_EVENTS,
  subscriptionInvoiceResourceSchema,
  SUBSCRIPTION_LIFECYCLE_EVENTS,
  subscriptionResourceSchema,
} from "../lib/billing/lemon-webhook-schemas";
import { normalizeBillingEmail, selectWebhookUserId } from "../lib/billing/webhook-user";

const SECRET = "lemon-webhook-test-secret";

function sign(rawBody: string, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

test("signature verification distinguishes missing secret, missing header and mismatch", () => {
  const env = { LEMONSQUEEZY_WEBHOOK_SECRET: SECRET } as unknown as NodeJS.ProcessEnv;
  const rawBody = JSON.stringify({ meta: { event_name: "subscription_created" }, data: { id: "1" } });

  assert.deepEqual(verifyLemonSignatureDetailed(rawBody, null, env), {
    valid: false,
    reason: "missing_signature",
  });

  assert.deepEqual(verifyLemonSignatureDetailed(rawBody, "not-the-right-signature", env), {
    valid: false,
    reason: "signature_mismatch",
  });

  assert.deepEqual(
    verifyLemonSignatureDetailed(rawBody, sign(rawBody), {} as NodeJS.ProcessEnv),
    { valid: false, reason: "missing_secret" },
  );

  assert.deepEqual(verifyLemonSignatureDetailed(rawBody, sign(rawBody), env), { valid: true });
});

test("every handled event name maps to exactly one resource category", () => {
  for (const name of SUBSCRIPTION_LIFECYCLE_EVENTS) {
    assert.equal(isLemonEventName(name), true);
    assert.equal(isSubscriptionLifecycleEvent(name), true);
    assert.equal(getResourceSchemaForEvent(name), subscriptionResourceSchema);
  }
  for (const name of SUBSCRIPTION_INVOICE_EVENTS) {
    assert.equal(isSubscriptionInvoiceEvent(name), true);
    assert.equal(getResourceSchemaForEvent(name), subscriptionInvoiceResourceSchema);
  }
  for (const name of ORDER_EVENTS) {
    assert.equal(isOrderEvent(name), true);
    assert.equal(getResourceSchemaForEvent(name), orderResourceSchema);
  }
  assert.equal(isLemonEventName("subscription_plan_changed"), false);
});

test("subscription_created payload (data.type=subscriptions) validates against the subscription schema", () => {
  const result = subscriptionResourceSchema.safeParse({
    type: "subscriptions",
    id: "sub_123",
    attributes: { status: "active", renews_at: "2026-07-01T00:00:00.000Z" },
  });
  assert.equal(result.success, true);
});

test("subscription_payment_success payload (data.type=subscription-invoices) is rejected by the subscription schema", () => {
  const invoicePayload = {
    type: "subscription-invoices",
    id: "inv_123",
    attributes: { subscription_id: "sub_123", total: 1900, currency: "USD" },
  };

  assert.equal(subscriptionResourceSchema.safeParse(invoicePayload).success, false);
  assert.equal(subscriptionInvoiceResourceSchema.safeParse(invoicePayload).success, true);
});

test("envelope schema accepts a realistic webhook body and exposes custom_data", () => {
  const body = {
    meta: {
      event_name: "subscription_created",
      custom_data: { user_id: "user_1", plan_key: "pro_monthly" },
    },
    data: {
      type: "subscriptions",
      id: "sub_123",
      attributes: { status: "active" },
    },
  };

  const result = lemonWebhookEnvelopeSchema.safeParse(body);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.meta.custom_data?.user_id, "user_1");
  }
});

test("webhook user match falls back to exact normalized payment email", () => {
  assert.equal(normalizeBillingEmail(" Buyer@Example.com "), "buyer@example.com");
  assert.equal(normalizeBillingEmail("not-an-email"), null);
  assert.equal(selectWebhookUserId({ emailUserId: "user_from_email" }), "user_from_email");
  assert.equal(selectWebhookUserId({ customUserId: "custom", existingUserId: "existing", emailUserId: "email" }), "custom");
});

test("malformed envelope (missing data.attributes) fails validation before any handler runs", () => {
  const body = { meta: { event_name: "subscription_created" }, data: { type: "subscriptions", id: "sub_1" } };
  assert.equal(lemonWebhookEnvelopeSchema.safeParse(body).success, false);
});

test("duplicate delivery of the same raw body produces the same idempotency hash", () => {
  const rawBody = JSON.stringify({ meta: { event_name: "subscription_updated" }, data: { id: "sub_1" } });
  assert.equal(hashPayload(rawBody), hashPayload(rawBody));

  const differentBody = JSON.stringify({ meta: { event_name: "subscription_updated" }, data: { id: "sub_2" } });
  assert.notEqual(hashPayload(rawBody), hashPayload(differentBody));
});

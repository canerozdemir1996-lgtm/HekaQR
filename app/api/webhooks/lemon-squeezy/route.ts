import { NextRequest, NextResponse } from "next/server";
import {
  hashPayload,
  retrieveLemonSubscription,
  verifyLemonSignatureDetailed,
} from "@/lib/billing/lemon-squeezy";
import {
  normalizeLemonStatus,
  upsertPaymentHistoryRecord,
  upsertSubscriptionRecord,
} from "@/lib/billing/subscriptions";
import { sbAdmin } from "@/lib/server/api-helpers";
import {
  getResourceSchemaForEvent,
  isLemonEventName,
  isOrderEvent,
  isSubscriptionInvoiceEvent,
  isSubscriptionLifecycleEvent,
  lemonWebhookEnvelopeSchema,
  type LemonEventName,
  type LemonWebhookMeta,
  type OrderResource,
  type SubscriptionInvoiceEvent,
  type SubscriptionInvoiceResource,
  type SubscriptionLifecycleEvent,
  type SubscriptionResource,
} from "@/lib/billing/lemon-webhook-schemas";

// This route is intentionally NOT covered by middleware.ts (its matcher only
// targets /dashboard, /admin, /vcard-builder), so Lemon Squeezy deliveries never
// hit next-auth session checks, CSRF, or any user-session middleware. Signature
// verification below is this route's only auth boundary — keep it that way.
export const dynamic = "force-dynamic";

type Sb = ReturnType<typeof sbAdmin>;

function asString(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function urlsOf(attributes: Record<string, unknown>) {
  return asRecord(attributes.urls);
}

async function updateEnterpriseQuoteStatus(input: {
  sb: Sb;
  eventName: LemonEventName;
  quotePublicId?: string | null;
  subscriptionId?: string | null;
  orderId?: string | null;
  variantId?: string | null;
}) {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
    last_event_name: input.eventName,
  };

  switch (input.eventName) {
    case "order_created":
    case "subscription_created":
    case "subscription_payment_success":
    case "subscription_payment_recovered":
      update.status = "converted";
      update.converted_at = now;
      update.last_error = null;
      break;
    case "subscription_updated":
      break;
    case "subscription_payment_failed":
      update.last_error = input.eventName;
      break;
    case "subscription_cancelled":
    case "subscription_expired":
    case "order_refunded":
    case "subscription_payment_refunded":
      update.status = "expired";
      update.last_error = input.eventName;
      break;
    default:
      break;
  }

  if (input.subscriptionId) {
    update.provider_subscription_id = input.subscriptionId;
  }
  if (input.orderId) {
    update.provider_order_id = input.orderId;
  }
  if (input.variantId) {
    update.provider_variant_id = input.variantId;
  }
  if (input.eventName === "subscription_created" || input.eventName === "subscription_updated") {
    update.checkout_created_at = now;
  }

  let query = input.sb.from("enterprise_quotes").update(update);
  if (input.quotePublicId) {
    query = query.eq("public_id", input.quotePublicId);
  } else if (input.subscriptionId) {
    query = query.eq("provider_subscription_id", input.subscriptionId);
  } else if (input.orderId) {
    query = query.eq("provider_order_id", input.orderId);
  } else {
    return;
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}

function resolveLifecycleStatus(
  eventName: SubscriptionLifecycleEvent,
  cancelled: boolean,
  rawStatus: string | null,
) {
  switch (eventName) {
    case "subscription_resumed":
    case "subscription_unpaused":
      return "active";
    case "subscription_paused":
      return "paused";
    case "subscription_expired":
      return "expired";
    default:
      return normalizeLemonStatus(cancelled && rawStatus === "active" ? "cancelled" : rawStatus);
  }
}

function resolveInvoiceDrivenStatus(
  eventName: SubscriptionInvoiceEvent,
  subscriptionAttributes: Record<string, unknown>,
) {
  if (eventName === "subscription_payment_failed") return "past_due";
  const cancelled = Boolean(subscriptionAttributes.cancelled);
  const rawStatus = asString(subscriptionAttributes.status);
  return normalizeLemonStatus(cancelled && rawStatus === "active" ? "cancelled" : rawStatus);
}

async function markEventUnmatched(sb: Sb, eventRowId: string) {
  await sb
    .from("billing_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventRowId);
}

async function markEventProcessed(sb: Sb, eventRowId: string, matchedUserId: string | null) {
  await sb
    .from("billing_webhook_events")
    .update({ matched_user_id: matchedUserId, processed_at: new Date().toISOString() })
    .eq("id", eventRowId);
}

async function handleSubscriptionLifecycleEvent(input: {
  sb: Sb;
  eventName: SubscriptionLifecycleEvent;
  meta: LemonWebhookMeta;
  resource: SubscriptionResource;
  eventRowId: string;
}) {
  const { sb, eventName, meta, resource, eventRowId } = input;
  const customData = meta.custom_data ?? {};
  const attributes = resource.attributes;
  const subscriptionId = resource.id;
  const quotePublicId = asString(customData.quote_id);

  const { data: existingSubscription, error: existingError } = await sb
    .from("subscriptions")
    .select("user_id, plan_key")
    .eq("provider", "lemon_squeezy")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const matchedUserId = asString(customData.user_id) ?? asString(existingSubscription?.user_id);
  if (!matchedUserId) {
    await markEventUnmatched(sb, eventRowId);
    return;
  }

  const cancelled = Boolean(attributes.cancelled);
  const rawStatus = asString(attributes.status);
  const normalizedStatus = resolveLifecycleStatus(eventName, cancelled, rawStatus);
  const urls = urlsOf(attributes);

  await upsertSubscriptionRecord({
    userId: matchedUserId,
    providerSubscriptionId: subscriptionId,
    providerCustomerId: asString(attributes.customer_id),
    providerOrderId: asString(attributes.order_id),
    providerProductId: asString(attributes.product_id),
    providerVariantId: asString(attributes.variant_id),
    explicitPlanKey: asString(customData.plan_key) ?? asString(existingSubscription?.plan_key),
    status: normalizedStatus,
    renewsAt: asString(attributes.renews_at),
    endsAt: asString(attributes.ends_at),
    trialEndsAt: asString(attributes.trial_ends_at),
    cancelledAt: normalizedStatus === "cancelled" ? new Date().toISOString() : null,
    cardBrand: asString(attributes.card_brand),
    cardLastFour: asString(attributes.card_last_four),
    paymentProcessor: asString(attributes.payment_processor),
    pause: (attributes.pause as Record<string, unknown> | null) ?? null,
    updatePaymentMethodUrl: asString(urls?.update_payment_method),
    customerPortalUrl: asString(urls?.customer_portal),
    providerCreatedAt: asString(attributes.created_at),
    providerUpdatedAt: asString(attributes.updated_at),
    testMode: Boolean(attributes.test_mode),
  });

  await updateEnterpriseQuoteStatus({
    sb,
    eventName,
    quotePublicId,
    subscriptionId,
    orderId: asString(attributes.order_id),
    variantId: asString(attributes.variant_id),
  });

  await markEventProcessed(sb, eventRowId, matchedUserId);
}

async function handleSubscriptionInvoiceEvent(input: {
  sb: Sb;
  eventName: SubscriptionInvoiceEvent;
  meta: LemonWebhookMeta;
  resource: SubscriptionInvoiceResource;
  eventRowId: string;
}) {
  const { sb, eventName, meta, resource, eventRowId } = input;
  const customData = meta.custom_data ?? {};
  const attributes = resource.attributes;
  const invoiceId = resource.id;
  const subscriptionId = asString(attributes.subscription_id);
  const quotePublicId = asString(customData.quote_id);
  const invoiceAmount = asNumber(attributes.total);
  const invoiceCurrency = asString(attributes.currency);

  if (!subscriptionId) {
    await markEventUnmatched(sb, eventRowId);
    return;
  }

  const { data: existingSubscription, error: existingError } = await sb
    .from("subscriptions")
    .select("user_id, plan_key")
    .eq("provider", "lemon_squeezy")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const matchedUserId = asString(customData.user_id) ?? asString(existingSubscription?.user_id);

  // Payment history is recorded even when the subscription can't be matched
  // to a user yet, keyed idempotently by the provider's invoice id.
  await upsertPaymentHistoryRecord({
    userId: matchedUserId,
    providerInvoiceId: invoiceId,
    providerSubscriptionId: subscriptionId,
    status: eventName,
    amount: invoiceAmount,
    currency: invoiceCurrency,
    billedAt: asString(attributes.created_at) ?? new Date().toISOString(),
  });

  if (matchedUserId) {
    const subscription = await retrieveLemonSubscription(subscriptionId);
    const subAttributes = subscription.attributes ?? {};
    const normalizedStatus = resolveInvoiceDrivenStatus(eventName, subAttributes);
    const urls = asRecord(subAttributes.urls);

    await upsertSubscriptionRecord({
      userId: matchedUserId,
      providerSubscriptionId: subscriptionId,
      providerCustomerId: asString(subAttributes.customer_id),
      providerOrderId: asString(subAttributes.order_id),
      providerProductId: asString(subAttributes.product_id),
      providerVariantId: asString(subAttributes.variant_id),
      explicitPlanKey: asString(customData.plan_key) ?? asString(existingSubscription?.plan_key),
      status: normalizedStatus,
      renewsAt: asString(subAttributes.renews_at),
      endsAt: asString(subAttributes.ends_at),
      trialEndsAt: asString(subAttributes.trial_ends_at),
      cancelledAt: normalizedStatus === "cancelled" ? new Date().toISOString() : null,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      cardBrand: asString(subAttributes.card_brand),
      cardLastFour: asString(subAttributes.card_last_four),
      paymentProcessor: asString(subAttributes.payment_processor),
      pause: (subAttributes.pause as Record<string, unknown> | null) ?? null,
      updatePaymentMethodUrl: asString(urls?.update_payment_method),
      customerPortalUrl: asString(urls?.customer_portal),
      providerCreatedAt: asString(subAttributes.created_at),
      providerUpdatedAt: asString(subAttributes.updated_at),
      testMode: Boolean(subAttributes.test_mode),
    });
  }

  await updateEnterpriseQuoteStatus({
    sb,
    eventName,
    quotePublicId,
    subscriptionId,
    orderId: asString(attributes.order_id),
    variantId: null,
  });

  await markEventProcessed(sb, eventRowId, matchedUserId);
}

async function handleOrderEvent(input: {
  sb: Sb;
  eventName: "order_created" | "order_refunded";
  meta: LemonWebhookMeta;
  resource: OrderResource;
  eventRowId: string;
}) {
  const { sb, eventName, meta, resource, eventRowId } = input;
  const customData = meta.custom_data ?? {};
  const attributes = resource.attributes;
  const orderId = resource.id;
  const quotePublicId = asString(customData.quote_id);
  const firstOrderItem = asRecord(attributes.first_order_item);
  const variantId = asString(firstOrderItem?.variant_id);

  await updateEnterpriseQuoteStatus({
    sb,
    eventName,
    quotePublicId,
    orderId,
    variantId,
  });

  await markEventUnmatched(sb, eventRowId);
}

export async function POST(req: NextRequest) {
  // Read the body exactly once — re-reading req.text()/req.json() on the same
  // request throws in the Next.js runtime and would also break signature
  // verification, which must run against the exact bytes Lemon Squeezy signed.
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-signature");

  const signatureCheck = verifyLemonSignatureDetailed(rawBody, signatureHeader);
  if (!signatureCheck.valid) {
    if (signatureCheck.reason === "missing_secret") {
      console.error("[lemon-webhook] rejected: LEMONSQUEEZY_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
    }
    if (signatureCheck.reason === "missing_signature") {
      console.warn("[lemon-webhook] rejected: missing X-Signature header", {
        bodyLength: rawBody.length,
      });
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    console.warn("[lemon-webhook] rejected: signature mismatch", {
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Signature is verified before any JSON parsing — never feed unverified
  // bytes into JSON.parse for a webhook endpoint.
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch (error) {
    console.error("[lemon-webhook] rejected: invalid JSON body", {
      message: error instanceof Error ? error.message : "Unknown error",
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const envelope = lemonWebhookEnvelopeSchema.safeParse(rawPayload);
  if (!envelope.success) {
    console.error("[lemon-webhook] rejected: payload failed envelope validation", {
      issues: envelope.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return NextResponse.json({ error: "Invalid webhook envelope" }, { status: 400 });
  }

  const { meta, data } = envelope.data;
  const eventName = req.headers.get("x-event-name") ?? meta.event_name;

  if (!isLemonEventName(eventName)) {
    // Signature is valid but the event isn't one we act on — ack with 200 so
    // Lemon Squeezy doesn't retry, and log it as ignored for visibility.
    console.info("[lemon-webhook] ignored: unsupported event", { eventName });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const resourceSchema = getResourceSchemaForEvent(eventName);
  const resourceCheck = resourceSchema.safeParse(data);
  if (!resourceCheck.success) {
    console.error("[lemon-webhook] rejected: resource payload failed schema validation", {
      eventName,
      dataType: (data as { type?: unknown }).type,
      issues: resourceCheck.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const payloadHash = hashPayload(rawBody);
  const sb = sbAdmin();
  const resourceId = resourceCheck.data.id;

  const { data: eventRow, error: insertError } = await sb
    .from("billing_webhook_events")
    .insert({
      provider: "lemon_squeezy",
      event_name: eventName,
      payload_hash: payloadHash,
      provider_resource_id: resourceId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // Same raw body delivered again (Lemon Squeezy retry) — already processed.
      console.info("[lemon-webhook] duplicate delivery ignored", { eventName, resourceId });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[lemon-webhook] rejected: failed to record webhook event", {
      eventName,
      resourceId,
      message: insertError.message,
    });
    return NextResponse.json({ error: "Temporary webhook storage failure" }, { status: 500 });
  }

  const cleanupEventRow = async () => {
    await sb
      .from("billing_webhook_events")
      .delete()
      .eq("id", eventRow.id)
      .then((r) => r, () => null);
  };

  try {
    if (isSubscriptionLifecycleEvent(eventName)) {
      await handleSubscriptionLifecycleEvent({
        sb,
        eventName,
        meta,
        resource: resourceCheck.data as SubscriptionResource,
        eventRowId: eventRow.id,
      });
    } else if (isSubscriptionInvoiceEvent(eventName)) {
      await handleSubscriptionInvoiceEvent({
        sb,
        eventName,
        meta,
        resource: resourceCheck.data as SubscriptionInvoiceResource,
        eventRowId: eventRow.id,
      });
    } else if (isOrderEvent(eventName)) {
      await handleOrderEvent({
        sb,
        eventName,
        meta,
        resource: resourceCheck.data as OrderResource,
        eventRowId: eventRow.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await cleanupEventRow();
    console.error("[lemon-webhook] rejected: processing failed", {
      eventName,
      resourceId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

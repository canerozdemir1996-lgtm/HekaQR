import { NextRequest, NextResponse } from "next/server";
import { hashPayload, retrieveLemonSubscription, verifyLemonSignature } from "@/lib/billing/lemon-squeezy";
import { normalizeLemonStatus, upsertSubscriptionRecord } from "@/lib/billing/subscriptions";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
};

const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
]);

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventName = req.headers.get("x-event-name") ?? payload.meta?.event_name ?? "unknown";
  if (!HANDLED_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payloadHash = hashPayload(rawBody);
  const sb = sbAdmin();
  const resourceId = asString(payload.data?.id);

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
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("Webhook event log insert failed", {
      eventName,
      message: insertError.message,
    });
    return NextResponse.json({ error: "Temporary webhook storage failure" }, { status: 500 });
  }

  const cleanupEventRow = async () => {
    if (!eventRow?.id) return;
    await sb.from("billing_webhook_events").delete().eq("id", eventRow.id).then((r) => r, () => null);
  };

  try {
    const dataType = payload.data?.type ?? "";
    const customData = payload.meta?.custom_data ?? {};
    const attributes = payload.data?.attributes ?? {};

    let subscriptionId = dataType === "subscriptions"
      ? asString(payload.data?.id)
      : asString(attributes.subscription_id);

    let subscriptionAttributes = dataType === "subscriptions"
      ? attributes
      : null;

    const invoiceAmount = asNumber(attributes.total);
    const invoiceCurrency = asString(attributes.currency);

    if (!subscriptionId) {
      await sb.from("billing_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventRow.id);
      return NextResponse.json({ ok: true, unmatched: true });
    }

    if (!subscriptionAttributes) {
      const subscription = await retrieveLemonSubscription(subscriptionId);
      subscriptionId = subscription.id;
      subscriptionAttributes = subscription.attributes ?? {};
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
    if (!matchedUserId) {
      await sb.from("billing_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventRow.id);
      return NextResponse.json({ ok: true, unmatched: true });
    }

    const cancelled = Boolean(subscriptionAttributes.cancelled);
    const rawStatus = asString(subscriptionAttributes.status);
    const normalizedStatus =
      eventName === "subscription_resumed"
        ? "active"
        : eventName === "subscription_unpaused"
          ? "active"
          : eventName === "subscription_paused"
            ? "paused"
            : eventName === "subscription_payment_failed"
              ? "past_due"
              : eventName === "subscription_expired"
                ? "expired"
                : normalizeLemonStatus(cancelled && rawStatus === "active" ? "cancelled" : rawStatus);

    await upsertSubscriptionRecord({
      userId: matchedUserId,
      providerSubscriptionId: subscriptionId,
      providerCustomerId: asString(subscriptionAttributes.customer_id),
      providerOrderId: asString(subscriptionAttributes.order_id),
      providerProductId: asString(subscriptionAttributes.product_id),
      providerVariantId: asString(subscriptionAttributes.variant_id),
      explicitPlanKey: asString(customData.plan_key) ?? asString(existingSubscription?.plan_key),
      status: normalizedStatus,
      renewsAt: asString(subscriptionAttributes.renews_at),
      endsAt: asString(subscriptionAttributes.ends_at),
      trialEndsAt: asString(subscriptionAttributes.trial_ends_at),
      cancelledAt: normalizedStatus === "cancelled" ? new Date().toISOString() : null,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      cardBrand: asString(subscriptionAttributes.card_brand),
      cardLastFour: asString(subscriptionAttributes.card_last_four),
      paymentProcessor: asString(subscriptionAttributes.payment_processor),
      pause: (subscriptionAttributes.pause as Record<string, unknown> | null) ?? null,
      updatePaymentMethodUrl: asString((subscriptionAttributes.urls as Record<string, unknown> | undefined)?.update_payment_method),
      customerPortalUrl: asString(
        (subscriptionAttributes.urls as Record<string, unknown> | undefined)?.customer_portal,
      ),
      providerCreatedAt: asString(subscriptionAttributes.created_at),
      providerUpdatedAt: asString(subscriptionAttributes.updated_at),
      testMode: Boolean(subscriptionAttributes.test_mode),
    });

    await sb.from("billing_webhook_events")
      .update({
        matched_user_id: matchedUserId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventRow.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    await cleanupEventRow();
    console.error("Lemon webhook processing failed", {
      eventName,
      resourceId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

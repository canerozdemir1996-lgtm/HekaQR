import { z } from "zod";

// Lemon Squeezy uses a different `data.type` per resource — subscriptions,
// subscription-invoices and orders are NOT interchangeable. Each event name
// below is mapped to the resource shape it actually carries.

const numericIdLike = z.union([z.string(), z.number()]).nullable().optional();
const amountLike = z.union([z.number(), z.string()]).nullable().optional();

export const lemonWebhookMetaSchema = z
  .object({
    event_name: z.string().min(1),
    custom_data: z
      .object({
        user_id: z.string().optional(),
        quote_id: z.string().optional(),
        configuration_id: z.string().optional(),
        plan_key: z.string().optional(),
      })
      .partial()
      .passthrough()
      .optional(),
    test_mode: z.boolean().optional(),
  })
  .passthrough();

export type LemonWebhookMeta = z.infer<typeof lemonWebhookMetaSchema>;

const urlsSchema = z
  .object({
    update_payment_method: z.string().nullable().optional(),
    customer_portal: z.string().nullable().optional(),
    customer_portal_update_subscription: z.string().nullable().optional(),
  })
  .partial()
  .passthrough()
  .nullable()
  .optional();

const subscriptionAttributesSchema = z
  .object({
    store_id: numericIdLike,
    customer_id: numericIdLike,
    order_id: numericIdLike,
    order_item_id: numericIdLike,
    product_id: numericIdLike,
    variant_id: numericIdLike,
    user_name: z.string().nullable().optional(),
    user_email: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    status_formatted: z.string().nullable().optional(),
    cancelled: z.boolean().nullable().optional(),
    trial_ends_at: z.string().nullable().optional(),
    billing_anchor: z.number().nullable().optional(),
    renews_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    test_mode: z.boolean().nullable().optional(),
    card_brand: z.string().nullable().optional(),
    card_last_four: z.string().nullable().optional(),
    payment_processor: z.string().nullable().optional(),
    pause: z.record(z.unknown()).nullable().optional(),
    urls: urlsSchema,
  })
  .passthrough();

export const subscriptionResourceSchema = z.object({
  type: z.literal("subscriptions"),
  id: z.string().min(1),
  attributes: subscriptionAttributesSchema,
});

export type SubscriptionResource = z.infer<typeof subscriptionResourceSchema>;

const subscriptionInvoiceAttributesSchema = z
  .object({
    store_id: numericIdLike,
    subscription_id: numericIdLike,
    customer_id: numericIdLike,
    order_id: numericIdLike,
    status: z.string().nullable().optional(),
    status_formatted: z.string().nullable().optional(),
    billing_reason: z.string().nullable().optional(),
    card_brand: z.string().nullable().optional(),
    card_last_four: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    total: amountLike,
    subtotal: amountLike,
    tax: amountLike,
    refunded: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const subscriptionInvoiceResourceSchema = z.object({
  type: z.literal("subscription-invoices"),
  id: z.string().min(1),
  attributes: subscriptionInvoiceAttributesSchema,
});

export type SubscriptionInvoiceResource = z.infer<typeof subscriptionInvoiceResourceSchema>;

const orderAttributesSchema = z
  .object({
    store_id: numericIdLike,
    customer_id: numericIdLike,
    order_number: numericIdLike,
    status: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    total: amountLike,
    first_order_item: z.record(z.unknown()).nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const orderResourceSchema = z.object({
  type: z.literal("orders"),
  id: z.string().min(1),
  attributes: orderAttributesSchema,
});

export type OrderResource = z.infer<typeof orderResourceSchema>;

export const lemonWebhookEnvelopeSchema = z
  .object({
    meta: lemonWebhookMetaSchema,
    data: z.object({
      type: z.string().min(1),
      id: z.string().min(1),
      attributes: z.record(z.unknown()),
    }),
  })
  .passthrough();

export type LemonWebhookEnvelope = z.infer<typeof lemonWebhookEnvelopeSchema>;

export const SUBSCRIPTION_LIFECYCLE_EVENTS = [
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
] as const;

export const SUBSCRIPTION_INVOICE_EVENTS = [
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
  "subscription_payment_refunded",
] as const;

export const ORDER_EVENTS = ["order_created", "order_refunded"] as const;

export type SubscriptionLifecycleEvent = (typeof SUBSCRIPTION_LIFECYCLE_EVENTS)[number];
export type SubscriptionInvoiceEvent = (typeof SUBSCRIPTION_INVOICE_EVENTS)[number];
export type OrderEvent = (typeof ORDER_EVENTS)[number];
export type LemonEventName = SubscriptionLifecycleEvent | SubscriptionInvoiceEvent | OrderEvent;

const EVENT_RESOURCE_SCHEMA: Record<LemonEventName, z.ZodTypeAny> = Object.fromEntries([
  ...SUBSCRIPTION_LIFECYCLE_EVENTS.map((name) => [name, subscriptionResourceSchema] as const),
  ...SUBSCRIPTION_INVOICE_EVENTS.map((name) => [name, subscriptionInvoiceResourceSchema] as const),
  ...ORDER_EVENTS.map((name) => [name, orderResourceSchema] as const),
]) as Record<LemonEventName, z.ZodTypeAny>;

export function isLemonEventName(value: string): value is LemonEventName {
  return value in EVENT_RESOURCE_SCHEMA;
}

export function isSubscriptionLifecycleEvent(value: LemonEventName): value is SubscriptionLifecycleEvent {
  return (SUBSCRIPTION_LIFECYCLE_EVENTS as readonly string[]).includes(value);
}

export function isSubscriptionInvoiceEvent(value: LemonEventName): value is SubscriptionInvoiceEvent {
  return (SUBSCRIPTION_INVOICE_EVENTS as readonly string[]).includes(value);
}

export function isOrderEvent(value: LemonEventName): value is OrderEvent {
  return (ORDER_EVENTS as readonly string[]).includes(value);
}

export function getResourceSchemaForEvent(eventName: LemonEventName) {
  return EVENT_RESOURCE_SCHEMA[eventName];
}

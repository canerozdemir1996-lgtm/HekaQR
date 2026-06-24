import type { SubscriptionInvoiceEvent, SubscriptionLifecycleEvent } from "@/lib/billing/lemon-webhook-schemas";

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
    case "active": return "active";
    case "on_trial": return "trial";
    case "cancelled": return "cancelled";
    case "expired": return "expired";
    case "paused": return "paused";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    default: return "free";
  }
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

/**
 * Yaşam döngüsü olaylarında (resume/pause/expire) Lemon Squeezy'nin ham
 * `status`/`cancelled` alanlarından çıkarım yapmak yerine olay adının kendisi
 * gerçek durumu belirler — örn. "subscription_paused" geldiğinde attributes.status
 * hâlâ "active" olabilir, asıl doğru durum olay adından gelir.
 */
export function resolveLifecycleStatus(
  eventName: SubscriptionLifecycleEvent,
  cancelled: boolean,
  rawStatus: string | null,
): InternalSubscriptionStatus {
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

/**
 * Fatura (invoice) olaylarında durum, abonelik kaynağının kendi
 * status/cancelled alanlarından çıkarılır — ödeme başarısız olduğunda
 * Lemon Squeezy aboneliği henüz "past_due" işaretlemeden önce bu olay gelir.
 */
export function resolveInvoiceDrivenStatus(
  eventName: SubscriptionInvoiceEvent,
  subscriptionAttributes: { cancelled?: unknown; status?: unknown },
): InternalSubscriptionStatus {
  if (eventName === "subscription_payment_failed") return "past_due";
  const cancelled = Boolean(subscriptionAttributes.cancelled);
  const rawStatus = subscriptionAttributes.status == null ? null : String(subscriptionAttributes.status).trim() || null;
  return normalizeLemonStatus(cancelled && rawStatus === "active" ? "cancelled" : rawStatus);
}

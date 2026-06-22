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

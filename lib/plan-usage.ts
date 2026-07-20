import { sbAdmin } from "@/lib/server/api-helpers";

export type MonthlyUsageKey = "bulk_qr_created" | "api_request";

function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Atomically reserves monthly usage. Database migration owns concurrency. */
export async function consumeMonthlyPlanUsage(
  userId: string,
  usageKey: MonthlyUsageKey,
  limit: number | null,
  amount = 1,
) {
  if (limit === null) return true;
  if (limit <= 0) return false;

  const { data, error } = await sbAdmin().rpc("consume_monthly_plan_usage", {
    p_user_id: userId,
    p_period: periodKey(),
    p_usage_key: usageKey,
    p_limit: limit,
    p_amount: amount,
  });
  if (error) throw error;
  return data === true;
}

/** Reads the current UTC-month usage without reserving additional quota. */
export async function getMonthlyPlanUsage(userId: string, usageKey: MonthlyUsageKey) {
  const { data, error } = await sbAdmin()
    .from("plan_usage_counters")
    .select("used")
    .eq("user_id", userId)
    .eq("period", periodKey())
    .eq("usage_key", usageKey)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.used === "number" ? data.used : 0;
}

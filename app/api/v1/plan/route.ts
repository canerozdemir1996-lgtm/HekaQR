import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/server/api-helpers";
import { getUserPlan } from "@/lib/check-plan";
import { PLAN_LABEL, SUB_STATUS_LABEL, GRACE_PERIOD_MS } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

// GET /api/v1/plan — current user's plan info, limits, and usage
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const info = await getUserPlan(auth.userId);

    const graceDaysLeft = (() => {
      if (info.status !== "expired" || !info.expires_at) return null;
      const elapsed = Date.now() - new Date(info.expires_at).getTime();
      const remaining = GRACE_PERIOD_MS - elapsed;
      return remaining > 0 ? Math.ceil(remaining / 86400_000) : 0;
    })();

    // Days left until plan_expires_at (renewal/end date) — distinct from
    // grace_days_left, which only applies to the post-expiry grace window.
    const daysLeft = (() => {
      if (!info.expires_at) return null;
      const remaining = new Date(info.expires_at).getTime() - Date.now();
      return remaining > 0 ? Math.ceil(remaining / 86400_000) : 0;
    })();

    return NextResponse.json({
      plan: info.plan,
      plan_label: PLAN_LABEL[info.plan],
      entitlement_plan: info.entitlement_plan,
      entitlement_plan_label: PLAN_LABEL[info.entitlement_plan],
      license_key: info.license_key,
      license_plan: info.license_plan,
      license_type: info.license_type,
      status: info.status,
      status_label: SUB_STATUS_LABEL[info.status],
      expires_at: info.expires_at,
      days_left: daysLeft,
      grace_days_left: graceDaysLeft,
      limits: info.limits,
      usage: {
        qr_count: info.qr_count,
        qr_limit: info.limits.max_qr,
        qr_pct: info.limits.max_qr === -1 ? 0 : Math.round((info.qr_count / info.limits.max_qr) * 100),
      },
      can_create_qr: info.can_create_qr,
      at_qr_limit: info.at_qr_limit,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { getUserPlan } from "@/lib/check-plan";
import { PLAN_LABEL, SUB_STATUS_LABEL, GRACE_PERIOD_MS } from "@/lib/plan-limits";
import { resolveDashboardCapabilities } from "@/lib/dashboard-navigation";
import { getMonthlyPlanUsage } from "@/lib/plan-usage";

export const dynamic = "force-dynamic";

// GET /api/v1/plan — current user's plan info, limits, and usage
export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sb = sbAdmin();
    const [info, membershipsResult, bulkQrUsed] = await Promise.all([
      getUserPlan(auth.userId),
      sb
        .from("organization_members")
        .select("org_id")
        .eq("user_id", auth.userId)
        .eq("status", "active"),
      // Keep the plan endpoint usable while older/self-hosted databases are
      // catching up with the optional usage-counter migration.
      getMonthlyPlanUsage(auth.userId, "bulk_qr_created").catch(() => null),
    ]);
    const orgIds = membershipsResult.error
      ? []
      : (membershipsResult.data ?? []).map((row) => row.org_id).filter(Boolean);
    let qrTypesQuery = sb
      .from("qr_codes")
      .select("qr_type")
      .is("deleted_at", null)
      .limit(5000);
    qrTypesQuery = orgIds.length
      ? qrTypesQuery.or(`user_id.eq.${auth.userId},organization_id.in.(${orgIds.join(",")})`)
      : qrTypesQuery.eq("user_id", auth.userId);
    const qrTypesResult = await qrTypesQuery;
    const dashboard_capabilities = qrTypesResult.error
      ? { orders: true, bookings: true, feedback: true, exams: true }
      : resolveDashboardCapabilities(qrTypesResult.data);
    const bulkQrLimit = info.limits.max_bulk_qr_per_month;

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
        bulk_qr_created: bulkQrUsed,
        bulk_qr_limit: bulkQrLimit,
        bulk_qr_remaining:
          bulkQrLimit === null
            ? null
            : typeof bulkQrUsed === "number"
              ? Math.max(0, bulkQrLimit - bulkQrUsed)
              : undefined,
      },
      can_create_qr: info.can_create_qr,
      at_qr_limit: info.at_qr_limit,
      dashboard_capabilities,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { isStandardCheckoutPlanKey } from "@/lib/billing/plans";
import { isLemonCheckoutConfigured } from "@/lib/billing/lemon-squeezy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan");

  // Readiness probe for the standard Starter/Pro checkout widget only.
  if (!isStandardCheckoutPlanKey(plan)) {
    return NextResponse.json({ ready: false, reason: "invalid_plan" }, { status: 400 });
  }

  const ready = isLemonCheckoutConfigured(plan);
  return NextResponse.json({
    ready,
    reason: ready ? null : "billing_not_configured",
  });
}

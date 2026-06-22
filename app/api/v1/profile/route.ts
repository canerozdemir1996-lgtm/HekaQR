import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { getUserPlan } from "@/lib/check-plan";
import { PLAN_LABEL, SUB_STATUS_LABEL } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const sb = sbAdmin();
  const [userResult, settingsResult, subscriptionResult, paymentsResult, planResult] = await Promise.all([
    sb.auth.admin.getUserById(auth.userId),
    sb.from("user_settings").select("*").eq("user_id", auth.userId).maybeSingle(),
    sb.from("subscriptions").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("billing_payment_history").select("*").eq("user_id", auth.userId).order("billed_at", { ascending: false }).limit(50),
    getUserPlan(auth.userId),
  ]);

  const dbError = settingsResult.error ?? subscriptionResult.error ?? paymentsResult.error;
  if (dbError) {
    return NextResponse.json({ error: safeDbErrorMessage(dbError, "profile.GET") }, { status: 500 });
  }
  if (userResult.error || !userResult.data.user) {
    return NextResponse.json({ error: "Hesap bilgileri bulunamadı." }, { status: 404 });
  }

  const user = userResult.data.user;
  const plan = await planResult;
  return NextResponse.json({
    account: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: settingsResult.data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      role: auth.role ?? "user",
      email_verified: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    settings: settingsResult.data,
    plan: {
      key: plan.plan,
      label: PLAN_LABEL[plan.plan],
      status: plan.status,
      status_label: SUB_STATUS_LABEL[plan.status],
      expires_at: plan.expires_at,
      limits: plan.limits,
      usage: { qr_count: plan.qr_count },
      can_create_qr: plan.can_create_qr,
      at_qr_limit: plan.at_qr_limit,
    },
    subscription: subscriptionResult.data,
    payments: paymentsResult.data ?? [],
  });
}

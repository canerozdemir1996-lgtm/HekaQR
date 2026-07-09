import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LemonConfigError, retrieveLemonSubscription } from "@/lib/billing/lemon-squeezy";
import { getLatestSubscriptionForUser } from "@/lib/billing/subscriptions";
import { getUserPlan } from "@/lib/check-plan";

export const dynamic = "force-dynamic";

const VIP_PORTAL_MESSAGE =
  "VIP kullanıcılar abonelik yönetimi yapamaz. Bu paket manuel/özel olarak tanımlandığı için destek ile iletişime geçmelisiniz.";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Abonelik yönetimi için giriş yapmalısınız." }, { status: 401 });
  }

  try {
    const plan = await getUserPlan(userId).catch(() => null);
    if (plan?.plan === "vip") {
      return NextResponse.json(
        { error: VIP_PORTAL_MESSAGE, code: "manual_vip_plan" },
        { status: 409 },
      );
    }

    const subscription = await getLatestSubscriptionForUser(userId);
    const providerSubscriptionId = subscription?.provider_subscription_id as string | undefined;

    if (!providerSubscriptionId) {
      return NextResponse.json({ error: "Yonetilebilir bir abonelik bulunamadi." }, { status: 404 });
    }

    const lemonSubscription = await retrieveLemonSubscription(providerSubscriptionId);
    const url =
      lemonSubscription.attributes?.urls?.customer_portal
      ?? lemonSubscription.attributes?.urls?.customer_portal_update_subscription
      ?? null;

    if (!url) {
      return NextResponse.json({ error: "Portal bağlantısı hazırlanamadı." }, { status: 404 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof LemonConfigError) {
      console.error("Lemon portal configuration error", {
        userId,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Abonelik yönetimi eksik ödeme ayarları nedeniyle hazırlanamadı." },
        { status: 500 },
      );
    }

    console.error("Lemon portal lookup failed", {
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Abonelik yönetim bağlantısı hazırlanamadı. Lütfen tekrar deneyin." },
      { status: 502 },
    );
  }
}

export async function POST() {
  return GET();
}

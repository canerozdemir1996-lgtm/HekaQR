import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";
import { retrieveLemonSubscription } from "@/lib/billing/lemon-squeezy";
import { getLatestSubscriptionForUser } from "@/lib/billing/subscriptions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Abonelik yonetimi icin giris yapmalisiniz." }, { status: 401 });
  }

  try {
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
      return NextResponse.json({ error: "Portal baglantisi hazirlanamadi." }, { status: 404 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Lemon portal lookup failed", {
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Abonelik yonetim baglantisi hazirlanamadi. Lutfen tekrar deneyin." },
      { status: 502 },
    );
  }
}

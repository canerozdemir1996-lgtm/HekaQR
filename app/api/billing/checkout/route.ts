import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";
import {
  LemonConfigError,
  createLemonCheckout,
  detectCheckoutLocale,
} from "@/lib/billing/lemon-squeezy";
import { isCheckoutPlanKey } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId || !email) {
    return NextResponse.json(
      { error: "Guvenli odeme oturumu icin giris yapmalisiniz.", loginUrl: "/login" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const plan = typeof body?.plan === "string" ? body.plan : null;

  if (!isCheckoutPlanKey(plan)) {
    return NextResponse.json({ error: "Gecersiz plan secimi." }, { status: 400 });
  }

  try {
    const checkout = await createLemonCheckout({
      planKey: plan,
      email,
      name: session.user.name ?? undefined,
      userId,
      locale: detectCheckoutLocale(req.headers.get("accept-language")),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof LemonConfigError) {
      return NextResponse.json(
        { error: "Odeme altyapisi henuz tamamlanmadi. Lutfen daha sonra tekrar deneyin." },
        { status: 500 },
      );
    }

    console.error("Lemon checkout creation failed", {
      plan,
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Guvenli odeme oturumu hazirlanamadi. Lutfen tekrar deneyin." },
      { status: 502 },
    );
  }
}

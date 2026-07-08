import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  LemonConfigError,
  createLemonCheckout,
  detectCheckoutLocale,
  isLemonCheckoutConfigured,
} from "@/lib/billing/lemon-squeezy";
import { isCheckoutPlanKey } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  const email = user?.email;

  if (!userId || !email) {
    return NextResponse.json(
      { error: "Güvenli ödeme oturumu için giriş yapmalısınız.", loginUrl: "/login" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const plan = typeof body?.plan === "string" ? body.plan : null;

  if (!isCheckoutPlanKey(plan)) {
    return NextResponse.json({ error: "Geçersiz plan seçimi." }, { status: 400 });
  }

  if (!isLemonCheckoutConfigured(plan)) {
    console.error("Lemon checkout is not configured", {
      plan,
      userId,
      code: "billing_not_configured",
    });

    return NextResponse.json(
      {
        error: "Odeme altyapisi bu ortamda henuz yapilandirilmamis. Lutfen teklif akisiyla devam edin.",
        code: "billing_not_configured",
      },
      { status: 503 },
    );
  }

  try {
    const checkout = await createLemonCheckout({
      planKey: plan,
      email,
      name: (user?.user_metadata?.full_name as string | undefined) ?? (user?.user_metadata?.name as string | undefined) ?? undefined,
      userId,
      locale: detectCheckoutLocale(req.headers.get("accept-language")),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof LemonConfigError) {
      console.error("Lemon checkout configuration error", {
        plan,
        userId,
        message: error.message,
      });
      Sentry.captureException(error, { tags: { area: "billing-checkout" }, extra: { plan, userId } });

      return NextResponse.json(
        {
          error: "Ödeme altyapısı eksik ayarlar nedeniyle hazırlanamadı. Lütfen teklif akışıyla devam edin.",
          code: "billing_not_configured",
        },
        { status: 500 },
      );
    }

    console.error("Lemon checkout creation failed", {
      plan,
      userId,
      code: "provider_checkout_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    Sentry.captureException(error, { tags: { area: "billing-checkout" }, extra: { plan, userId } });

    return NextResponse.json(
      {
        error: "Güvenli ödeme oturumu hazırlanamadı. Lütfen tekrar deneyin.",
        code: "provider_checkout_failed",
      },
      { status: 502 },
    );
  }
}

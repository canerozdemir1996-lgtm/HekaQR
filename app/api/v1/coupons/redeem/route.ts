import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashCouponRedeemer, normalizeCouponCode } from "@/lib/coupons";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({
  slug: z.string().min(1).max(80),
  code: z.string().min(2).max(80),
  order_ref: z.string().max(128).optional().nullable(),
  channel: z.string().max(64).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`coupon_redeem:${ip}`, RATE_LIMITS.FEEDBACK_SUBMIT.max, RATE_LIMITS.FEEDBACK_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const parsed = redeemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: "invalid_request", message: "Kod bilgisi eksik veya hatalı." }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  const redeemerHash = hashCouponRedeemer(`${ip}|${userAgent}`);
  const sb = sbAdmin();
  const { data, error } = await sb.rpc("redeem_coupon_code", {
    p_slug: parsed.data.slug,
    p_code: normalizeCouponCode(parsed.data.code),
    p_order_ref: parsed.data.order_ref ?? null,
    p_channel: parsed.data.channel ?? "web",
    p_redeemer_hash: redeemerHash,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, status: "service_error", message: safeDbErrorMessage(error, "coupons.redeem", "Kupon şu anda doğrulanamıyor.") },
      { status: 500 }
    );
  }

  const body = (data ?? {}) as { ok?: boolean; status?: string; message?: string };
  return NextResponse.json(body, { status: body.ok ? 200 : 409 });
}

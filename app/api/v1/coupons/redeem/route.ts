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
  const code = normalizeCouponCode(parsed.data.code);
  const orderRef = parsed.data.order_ref ?? null;
  const channel = parsed.data.channel ?? "web";

  const { data: qr, error: qrError } = await sb
    .from("qr_codes")
    .select("id,is_active,deleted_at,coupon_campaigns(id,discount,description,valid_until)")
    .eq("short_slug", parsed.data.slug.toLowerCase().trim())
    .maybeSingle();

  if (qrError) {
    return NextResponse.json(
      { ok: false, status: "service_error", message: safeDbErrorMessage(qrError, "coupons.redeem.qr", "Kupon şu anda doğrulanamıyor.") },
      { status: 500 }
    );
  }

  const campaign = Array.isArray(qr?.coupon_campaigns) ? qr?.coupon_campaigns[0] : qr?.coupon_campaigns;
  if (!qr || qr.is_active === false || qr.deleted_at || !campaign) {
    return NextResponse.json({ ok: false, status: "campaign_not_found", message: "Kupon kampanyası bulunamadı." }, { status: 404 });
  }

  if (campaign.valid_until && new Date(campaign.valid_until) < new Date()) {
    await sb.from("coupon_redemption_attempts").insert({
      campaign_id: campaign.id,
      code,
      status: "expired",
      order_ref: orderRef,
      channel,
      redeemer_hash: redeemerHash,
    });
    return NextResponse.json({ ok: false, status: "expired", message: "Bu kuponun süresi dolmuş." }, { status: 409 });
  }

  const { data: redeemed, error: redeemError } = await sb
    .from("coupon_codes")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      order_ref: orderRef,
      channel,
      used_by_hash: redeemerHash,
    })
    .eq("campaign_id", campaign.id)
    .eq("code", code)
    .eq("status", "active")
    .select("id,used_at")
    .maybeSingle();

  if (redeemError) {
    return NextResponse.json(
      { ok: false, status: "service_error", message: safeDbErrorMessage(redeemError, "coupons.redeem.update", "Kupon şu anda doğrulanamıyor.") },
      { status: 500 }
    );
  }

  if (redeemed) {
    await sb.from("coupon_redemption_attempts").insert({
      campaign_id: campaign.id,
      coupon_code_id: redeemed.id,
      code,
      status: "used",
      order_ref: orderRef,
      channel,
      redeemer_hash: redeemerHash,
    });
    return NextResponse.json({
      ok: true,
      status: "used",
      message: "Kupon doğrulandı.",
      discount: campaign.discount,
      description: campaign.description,
      used_at: redeemed.used_at,
    });
  }

  const { data: existing } = await sb
    .from("coupon_codes")
    .select("id,status")
    .eq("campaign_id", campaign.id)
    .eq("code", code)
    .maybeSingle();

  const status = !existing ? "invalid" : existing.status === "used" ? "already_used" : existing.status;
  await sb.from("coupon_redemption_attempts").insert({
    campaign_id: campaign.id,
    coupon_code_id: existing?.id ?? null,
    code,
    status,
    order_ref: orderRef,
    channel,
    redeemer_hash: redeemerHash,
  });

  return NextResponse.json({
    ok: false,
    status,
    message: status === "already_used"
      ? "Bu kod daha önce kullanılmış."
      : status === "void"
        ? "Bu kod iptal edilmiş."
        : "Kod geçersiz.",
  }, { status: 409 });
}

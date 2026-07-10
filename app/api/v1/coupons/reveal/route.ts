import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashCouponRedeemer, normalizeCouponCode } from "@/lib/coupons";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// Sipariş kodunu girip kupon kodunu açığa çıkaran akış.
// Kullanıcı KUPON kodunu bilmez; sipariş referansını girer, sunucu kodu döner.
const revealSchema = z.object({
  slug: z.string().min(1).max(80),
  order_ref: z.string().min(1).max(128),
  channel: z.string().max(64).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`coupon_reveal:${ip}`, RATE_LIMITS.FEEDBACK_SUBMIT.max, RATE_LIMITS.FEEDBACK_SUBMIT.windowMs)) {
    return tooManyRequestsResponse();
  }

  const parsed = revealSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: "invalid_request", message: "Sipariş kodu zorunlu." }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  const redeemerHash = hashCouponRedeemer(`${ip}|${userAgent}`);
  const sb = sbAdmin();
  const orderRef = parsed.data.order_ref.trim();
  const normalizedRef = normalizeCouponCode(orderRef);
  const channel = parsed.data.channel ?? "public-landing";

  const { data: qr, error: qrError } = await sb
    .from("qr_codes")
    .select("id,is_active,deleted_at,coupon_campaigns(id,discount,description,valid_until,coupon_codes(code,status,created_at))")
    .eq("short_slug", parsed.data.slug.toLowerCase().trim())
    .maybeSingle();

  if (qrError) {
    return NextResponse.json(
      { ok: false, status: "service_error", message: safeDbErrorMessage(qrError, "coupons.reveal.qr", "Kupon şu anda doğrulanamıyor.") },
      { status: 500 }
    );
  }

  const campaign = Array.isArray(qr?.coupon_campaigns) ? qr?.coupon_campaigns[0] : qr?.coupon_campaigns;
  if (!qr || qr.is_active === false || qr.deleted_at || !campaign) {
    return NextResponse.json({ ok: false, status: "campaign_not_found", message: "Kupon kampanyası bulunamadı." }, { status: 404 });
  }

  if (campaign.valid_until && new Date(campaign.valid_until) < new Date()) {
    await sb.from("coupon_redemption_attempts").insert({
      campaign_id: campaign.id, code: normalizedRef, status: "expired", order_ref: orderRef, channel, redeemer_hash: redeemerHash,
    });
    return NextResponse.json({ ok: false, status: "expired", message: "Bu kuponun süresi dolmuş." }, { status: 409 });
  }

  // Gate: valid_order_refs doluysa sadece listedeki ref kodu açar.
  // Kolon migration sonrası gelir; yoksa guard ile boş (gate yok).
  const { data: refsRow } = await sb
    .from("coupon_campaigns")
    .select("valid_order_refs")
    .eq("id", campaign.id)
    .maybeSingle();
  const validRefs: string[] = Array.isArray(refsRow?.valid_order_refs) ? refsRow!.valid_order_refs : [];
  if (validRefs.length > 0 && !validRefs.includes(normalizedRef)) {
    await sb.from("coupon_redemption_attempts").insert({
      campaign_id: campaign.id, code: normalizedRef, status: "invalid_order", order_ref: orderRef, channel, redeemer_hash: redeemerHash,
    });
    return NextResponse.json({ ok: false, status: "invalid_order", message: "Sipariş kodu geçersiz." }, { status: 403 });
  }

  const codes = Array.isArray(campaign.coupon_codes) ? campaign.coupon_codes : [];
  const activeCode = codes.find((c: { status?: string }) => c?.status === "active") ?? codes[0];
  if (!activeCode?.code) {
    return NextResponse.json({ ok: false, status: "no_code", message: "Kupon kodu tanımlı değil." }, { status: 409 });
  }

  // Idempotent: aynı sipariş kodu daha önce açtıysa aynı kodu dön, sayaç artırma.
  const { data: prior } = await sb
    .from("coupon_redemption_attempts")
    .select("id")
    .eq("campaign_id", campaign.id)
    .eq("order_ref", orderRef)
    .eq("status", "revealed")
    .limit(1);

  if (!prior || prior.length === 0) {
    await sb.from("coupon_redemption_attempts").insert({
      campaign_id: campaign.id, code: activeCode.code, status: "revealed", order_ref: orderRef, channel, redeemer_hash: redeemerHash,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "revealed",
    code: activeCode.code,
    discount: campaign.discount,
    description: campaign.description,
  });
}

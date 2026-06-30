import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { couponValidUntilToIso, generateCouponCode, normalizeCouponCode } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const createCodesSchema = z.object({
  qr_id: z.string().uuid(),
  count: z.number().int().min(1).max(1000).default(1),
  prefix: z.string().max(16).optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createCodesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kupon kodu isteği." }, { status: 400 });

  const sb = sbAdmin();
  const { data: campaign, error: campaignError } = await sb
    .from("coupon_campaigns")
    .select("id,user_id")
    .eq("qr_id", parsed.data.qr_id)
    .maybeSingle();

  if (campaignError) {
    return NextResponse.json({ error: safeDbErrorMessage(campaignError, "coupons.codes.campaign") }, { status: 500 });
  }
  if (!campaign || campaign.user_id !== auth.userId) {
    return NextResponse.json({ error: "Kupon kampanyası bulunamadı." }, { status: 404 });
  }

  const seen = new Set<string>();
  while (seen.size < parsed.data.count) {
    seen.add(normalizeCouponCode(generateCouponCode(parsed.data.prefix ?? "QR")));
  }

  const expiresAt = couponValidUntilToIso(parsed.data.expires_at);
  const rows = Array.from(seen).map((code) => ({
    campaign_id: campaign.id,
    code,
    status: expiresAt && new Date(expiresAt) < new Date() ? "expired" : "active",
  }));

  const { data, error } = await sb.from("coupon_codes").insert(rows).select("code,status,created_at");
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "coupons.codes.insert") }, { status: 500 });

  return NextResponse.json({ codes: data ?? [] }, { status: 201 });
}

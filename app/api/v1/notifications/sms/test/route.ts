import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/server/api-helpers";
import { isSmsConfigured, sendSms } from "@/lib/notifications/sms";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();

  if (!phone) return NextResponse.json({ error: "Telefon numarası gerekli." }, { status: 400 });
  if (!isSmsConfigured()) {
    return NextResponse.json({ delivered: false, disabled: true, message: "SMS altyapısı şimdilik kurulu değil." });
  }

  const result = await sendSms({
    to: phone,
    message: "QR Publish test bildirimi: SMS kanalı aktif görünüyor.",
  });

  return NextResponse.json({
    delivered: result.delivered,
    provider: result.provider,
    message: result.delivered ? "Test SMS gönderildi." : "SMS servisi pasif.",
  });
}

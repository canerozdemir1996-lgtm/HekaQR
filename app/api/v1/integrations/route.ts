import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/server/api-helpers";
import { RATE_LIMITS, checkRateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";
import { postPublicJson } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`integration:${auth.userId}`, RATE_LIMITS.INTEGRATION.max, RATE_LIMITS.INTEGRATION.windowMs)) return tooManyRequestsResponse();

  return NextResponse.json({
    connectors: [
      { key: "webhook", label: "Webhook URL", hint: "Zapier, Make veya Google Sheets webhook adresi" },
      { key: "zapier", label: "Zapier", hint: "Catch Hook URL yapistirin" },
      { key: "make", label: "Make", hint: "Custom webhook URL yapistirin" },
    ],
  });
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const webhookUrl = String(body.webhookUrl || "").trim();

    if (!/^https?:\/\//i.test(webhookUrl) || webhookUrl.length > 2048) {
      return NextResponse.json({ error: "Gecerli bir webhook URL girin." }, { status: 400 });
    }

    const payload = {
      event: "integration.test",
      source: "qr-publish",
      userId: auth.userId,
      sentAt: new Date().toISOString(),
      sample: {
        type: "menu_order",
        qrTitle: "Ornek Menu QR",
        total: 420,
        currency: "TRY",
      },
    };

    const response = await postPublicJson(webhookUrl, JSON.stringify(payload));

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      message: response.ok ? "Test payload gönderildi." : "Webhook hedefi hata döndürdü.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test gönderimi başarısız." }, { status: 500 });
  }
}

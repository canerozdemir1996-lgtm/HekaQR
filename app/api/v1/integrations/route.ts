import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (!/^https?:\/\//i.test(webhookUrl)) {
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

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      message: response.ok ? "Test payload gonderildi." : "Webhook hedefi hata dondurdu.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test gonderimi basarisiz." }, { status: 500 });
  }
}

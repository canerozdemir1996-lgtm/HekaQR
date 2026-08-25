import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMITS, checkRateLimit, clientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`client_error:${clientIp(req)}`, RATE_LIMITS.CLIENT_ERROR.max, RATE_LIMITS.CLIENT_ERROR.windowMs)) return tooManyRequestsResponse();
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  try {
    const { message, digest, stack } = await req.json();
    const clean = (value: unknown, max: number) => String(value ?? "").replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").slice(0, max);
    console.error("[client-error]", {
      message: clean(message, 1000),
      digest: clean(digest, 200),
      stack: clean(stack, 4000),
    });
  } catch { /* ignore malformed body */ }
  return NextResponse.json({ ok: true });
}

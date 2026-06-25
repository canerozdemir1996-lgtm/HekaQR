import { NextRequest, NextResponse } from "next/server";
import { renderQrPngBuffer, renderStyledSvg } from "@/lib/qr-render";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Kayıt gerektirmeyen, statik QR render uç noktası — anasayfadaki hızlı
// oluşturucu ve Chrome eklentisi gibi kimliksiz/anonim istemciler için.
// Dinamik yönlendirme, tarama takibi veya tasarım kaydı YAPMAZ.
export async function GET(req: NextRequest) {
  if (!checkRateLimit(`instant_qr:${clientIp(req)}`, RATE_LIMITS.INSTANT_QR.max, RATE_LIMITS.INSTANT_QR.windowMs)) {
    return tooManyRequestsResponse();
  }

  const { searchParams } = req.nextUrl;
  const data = (searchParams.get("data") ?? "").slice(0, 2000);
  const format = (searchParams.get("format") ?? "png").trim().toLowerCase();
  const sizeRaw = Number(searchParams.get("size") ?? "300");
  const size = clamp(Number.isFinite(sizeRaw) ? sizeRaw : 300, 64, 1024);

  if (!data) return NextResponse.json({ error: "data zorunlu" }, { status: 400 });
  if (format !== "png" && format !== "svg") return NextResponse.json({ error: "format sadece png|svg" }, { status: 400 });

  const style = { dotType: "rounded", dotColor: "#0f172a", eyeFrameType: "extra-rounded", eyeDotType: "dot", useCustomEyeColor: true, eyeColor: "#7c3aed", bgColor: "#ffffff", margin: 16 };

  if (format === "svg") {
    const svg = renderStyledSvg(data, style, size);
    return new NextResponse(svg, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  const png = await renderQrPngBuffer(data, style, size);
  return new NextResponse(png as BodyInit, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}

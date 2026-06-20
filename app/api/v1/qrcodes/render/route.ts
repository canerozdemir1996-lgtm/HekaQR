import { NextRequest, NextResponse } from "next/server";
import { resolveQrRenderData } from "@/lib/qr-render-data";
import { renderQrPngBuffer, renderStyledSvg } from "@/lib/qr-render";

export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function renderCacheHeader(req: NextRequest) {
  const hasVersion = req.nextUrl.searchParams.has("v");
  return hasVersion
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const slug = (searchParams.get("slug") ?? "").trim();
    const format = (searchParams.get("format") ?? "png").trim().toLowerCase();
    const table = Number(searchParams.get("table") ?? "");
    const sizeRaw = Number(searchParams.get("size") ?? "512");
    const size = clamp(Number.isFinite(sizeRaw) ? sizeRaw : 512, 128, 2048);

    if (!slug) return NextResponse.json({ error: "slug zorunlu" }, { status: 400 });
    if (format !== "png" && format !== "svg") return NextResponse.json({ error: "format sadece png|svg" }, { status: 400 });

    const resolved = await resolveQrRenderData(req.nextUrl.origin, slug, table);
    if (!resolved) return NextResponse.json({ error: "QR bulunamadı" }, { status: 404 });

    if (format === "svg") {
      const svg = renderStyledSvg(resolved.payload, resolved.styleConfig, size);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": renderCacheHeader(req),
        },
      });
    }

    const png = await renderQrPngBuffer(resolved.payload, resolved.styleConfig, size);

    return new NextResponse(png as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": renderCacheHeader(req),
      },
    });
  } catch (error) {
    console.error("QR render error:", error);
    return NextResponse.json({ error: "QR render edilemedi." }, { status: 500 });
  }
}

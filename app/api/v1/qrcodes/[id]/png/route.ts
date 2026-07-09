import { NextRequest, NextResponse } from "next/server";
import { resolveQrRenderData } from "@/lib/qr-render-data";
import { renderQrPngBuffer } from "@/lib/qr-render";
import { authRequest, routeParams, sbAdmin } from "@/lib/server/api-helpers";
import { getRequestPublicOrigin } from "@/lib/requestPublicOrigin";

export const dynamic = "force-dynamic";

const ORG_ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "qrcode";
}

function cacheHeader(req: NextRequest) {
  return req.nextUrl.searchParams.has("v")
    ? "private, max-age=86400, immutable"
    : "private, max-age=300";
}

async function getOrgRole(sb: ReturnType<typeof sbAdmin>, userId: string, orgId: string | null | undefined) {
  if (!orgId) return null;
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") return null;
  return data.role as string;
}

async function canReadQr(
  sb: ReturnType<typeof sbAdmin>,
  userId: string,
  qr: { user_id?: string | null; organization_id?: string | null },
) {
  if (qr.user_id === userId) return true;
  const role = await getOrgRole(sb, userId, qr.organization_id);
  return Boolean(role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.viewer);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const auth = await authRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await routeParams(context);
    const sb = sbAdmin();
    const { data: qr, error } = await sb
      .from("qr_codes")
      .select("id,short_slug,user_id,organization_id,updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "QR yuklenemedi." }, { status: 500 });
    if (!qr || !(await canReadQr(sb, auth.userId, qr))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sizeRaw = Number(req.nextUrl.searchParams.get("size") ?? "720");
    const size = clamp(Number.isFinite(sizeRaw) ? sizeRaw : 720, 128, 2048);
    const tableRaw = req.nextUrl.searchParams.get("table");
    const table = tableRaw ? Number(tableRaw) : NaN;
    const resolved = await resolveQrRenderData(getRequestPublicOrigin(req), qr.short_slug, table);

    if (!resolved) return NextResponse.json({ error: "QR bulunamadi." }, { status: 404 });

    const png = await renderQrPngBuffer(resolved.payload, resolved.styleConfig, size);
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Cache-Control": cacheHeader(req),
    };

    if (req.nextUrl.searchParams.get("download") === "1") {
      headers["Content-Disposition"] = `attachment; filename="${safeFileName(qr.short_slug)}.png"`;
    }

    return new NextResponse(png as BodyInit, { status: 200, headers });
  } catch (error) {
    console.error("QR API PNG render error:", error);
    return NextResponse.json({ error: "QR PNG olusturulamadi." }, { status: 500 });
  }
}

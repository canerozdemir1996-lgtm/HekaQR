/**
 * GET  /api/admin/snapshots         — tüm menü snapshot durumlarını listele
 * POST /api/admin/snapshots/refresh — belirli bir slug için snapshot yenile
 */
import { NextRequest, NextResponse } from "next/server";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { generateMenuSnapshot } from "@/lib/services/menuSnapshotService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);

    const { data, error } = await sbAdmin
      .from("menu_snapshots")
      .select("id, slug, snapshot_at, error, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: safeDbErrorMessage(error, "admin-snapshots.GET") }, { status: 500 });
    }

    return NextResponse.json({ snapshots: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);

    const body = await req.json().catch(() => ({})) as { slug?: string; all?: boolean };

    if (body.all) {
      // Tüm aktif menü QR'ları için snapshot yenile
      const { data: qrs } = await sbAdmin
        .from("qr_codes")
        .select("short_slug")
        .eq("qr_type", "menu")
        .is("deleted_at", null)
        .limit(500);

      const slugs = (qrs ?? []).map((q: Record<string, unknown>) => String(q.short_slug));
      const results = await Promise.allSettled(slugs.map(s => generateMenuSnapshot(s)));
      const ok = results.filter(r => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
      const fail = results.length - ok;
      return NextResponse.json({ refreshed: ok, failed: fail });
    }

    const slug = String(body.slug ?? "").trim();
    if (!slug) return NextResponse.json({ error: "slug gerekli" }, { status: 400 });

    const result = await generateMenuSnapshot(slug);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

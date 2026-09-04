import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { requireOrgAccess, orgErrorResponse } from "@/lib/org-guard";
import { loadScanCountMap } from "@/lib/server/scanCounts";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/[id]/qrcodes
// Returns all QR codes belonging to org members.
// When organization_id column exists, also includes org-owned codes.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await requireOrgAccess(req, id, "viewer");
    const sb = sbAdmin();

    // Get all active member user_ids
    const { data: members, error: memberErr } = await sb
      .from("organization_members")
      .select("user_id")
      .eq("org_id", id)
      .eq("status", "active");

    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });

    const userIds = (members ?? []).map((m: any) => m.user_id as string);
    if (!userIds.length) return NextResponse.json({ qrcodes: [] });

    // Fetch QR codes for all member user_ids
    const { data: qrcodes, error: qrErr } = await sb
      .from("qr_codes")
      .select("id, title, short_slug, qr_type, is_active, scan_count, created_at, updated_at, user_id, folder_id, tags")
      .in("user_id", userIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 400 });

    // Build user_id → email map for display
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const userMap: Record<string, { email: string; full_name: string }> = {};
    for (const u of users) {
      if (userIds.includes(u.id)) {
        userMap[u.id] = {
          email: u.email ?? "",
          full_name: (u.user_metadata?.full_name as string) ?? (u.email?.split("@")[0] ?? ""),
        };
      }
    }

    const scanCountMap = await loadScanCountMap(sb, (qrcodes ?? []).map((qr: any) => qr.id)).catch(() => new Map<string, number>());
    const enriched = (qrcodes ?? []).map((qr: any) => ({
      ...qr,
      scan_count: scanCountMap.get(qr.id) ?? qr.scan_count ?? 0,
      owner_email: userMap[qr.user_id]?.email ?? "",
      owner_name: userMap[qr.user_id]?.full_name ?? "",
    }));

    return NextResponse.json({ qrcodes: enriched, member_count: userIds.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrOwner } from "@/lib/admin-guard";
import { safeDbErrorMessage } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/admin/organizations — list orgs with active member count, for the
// notification compose modal's "Organizasyona göre" audience picker.
export async function GET(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    if (actor.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: orgs, error } = await sbAdmin
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "admin-organizations.GET") }, { status: 500 });

    const { data: members, error: membersError } = await sbAdmin
      .from("organization_members")
      .select("org_id")
      .eq("status", "active");
    if (membersError) return NextResponse.json({ error: safeDbErrorMessage(membersError, "admin-organizations.members") }, { status: 500 });

    const counts = new Map<string, number>();
    for (const row of members ?? []) {
      counts.set(row.org_id, (counts.get(row.org_id) ?? 0) + 1);
    }

    const organizations = (orgs ?? []).map(org => ({
      id: org.id,
      name: org.name,
      member_count: counts.get(org.id) ?? 0,
    }));

    return NextResponse.json({ organizations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

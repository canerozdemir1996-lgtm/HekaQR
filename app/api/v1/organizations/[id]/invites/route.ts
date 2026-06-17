import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, routeParams } from "@/lib/server/api-helpers";
import { requireOrgAccess, orgErrorResponse } from "@/lib/org-guard";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/[id]/invites — list pending invites
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await routeParams(ctx);
  try {
    await requireOrgAccess(req, id, "admin");
    const sb = sbAdmin();

    const { data, error } = await sb
      .from("organization_invites")
      .select("id, email, role, expires_at, created_at, accepted_at")
      .eq("org_id", id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ invites: data ?? [] });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

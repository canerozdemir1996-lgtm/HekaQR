import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { requireOrgAccess, orgErrorResponse } from "@/lib/org-guard";

export const dynamic = "force-dynamic";

// DELETE /api/v1/organizations/[id]/invites/[inviteId] — cancel pending invite
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; inviteId: string }> }
) {
  const { id, inviteId } = await ctx.params;
  try {
    await requireOrgAccess(req, id, "admin");
    const sb = sbAdmin();

    const { error } = await sb
      .from("organization_invites")
      .delete()
      .eq("id", inviteId)
      .eq("org_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

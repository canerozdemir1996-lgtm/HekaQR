import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { requireOrgAccess, validateMemberRole, orgErrorResponse, orgRoleRank } from "@/lib/org-guard";

export const dynamic = "force-dynamic";

// PUT /api/v1/organizations/[id]/members/[userId] — update member role or status
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId: targetId } = await ctx.params;
  try {
    const { userId: actorId, role: actorRole } = await requireOrgAccess(req, id, "admin");

    if (actorId === targetId) {
      return NextResponse.json({ error: "Kendi rolünüzü değiştiremezsiniz." }, { status: 400 });
    }

    const sb = sbAdmin();
    const { data: targetMember } = await sb
      .from("organization_members")
      .select("role, status")
      .eq("org_id", id)
      .eq("user_id", targetId)
      .maybeSingle();

    if (!targetMember) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });

    // Only owner can change admin roles or promote to admin
    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Owner rolü değiştirilemez." }, { status: 403 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const newRole = validateMemberRole(body.role);
      if (newRole === "admin" && actorRole !== "owner") {
        return NextResponse.json({ error: "Admin rolü atamak için owner yetkisi gerekli." }, { status: 403 });
      }
      if (actorRole === "admin" && orgRoleRank(targetMember.role as any) >= orgRoleRank("admin")) {
        return NextResponse.json({ error: "Admin, başka bir adminin rolünü değiştiremez." }, { status: 403 });
      }
      patch.role = newRole;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "suspended") {
        return NextResponse.json({ error: "Geçersiz status." }, { status: 400 });
      }
      patch.status = body.status;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
    }

    const { error } = await sb
      .from("organization_members")
      .update(patch)
      .eq("org_id", id)
      .eq("user_id", targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// DELETE /api/v1/organizations/[id]/members/[userId] — remove member
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId: targetId } = await ctx.params;
  try {
    const { userId: actorId, role: actorRole } = await requireOrgAccess(req, id, "admin");

    if (actorId === targetId) {
      // Members can leave (self-remove) — but owner can't leave
      const sb = sbAdmin();
      const { data: self } = await sb
        .from("organization_members")
        .select("role")
        .eq("org_id", id)
        .eq("user_id", actorId)
        .maybeSingle();
      if (self?.role === "owner") {
        return NextResponse.json({ error: "Organizasyon sahibi ayrılamaz. Önce sahibi devredin." }, { status: 400 });
      }
    }

    const sb = sbAdmin();
    const { data: targetMember } = await sb
      .from("organization_members")
      .select("role")
      .eq("org_id", id)
      .eq("user_id", targetId)
      .maybeSingle();

    if (!targetMember) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Owner üyelikten çıkarılamaz." }, { status: 403 });
    }
    if (actorRole === "admin" && orgRoleRank(targetMember.role as any) >= orgRoleRank("admin")) {
      return NextResponse.json({ error: "Admin, başka bir admini çıkaramaz." }, { status: 403 });
    }

    const { error } = await sb
      .from("organization_members")
      .delete()
      .eq("org_id", id)
      .eq("user_id", targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

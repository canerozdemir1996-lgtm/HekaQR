import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, routeParams } from "@/lib/server/api-helpers";
import { requireOrgAccess, validateMemberRole, orgErrorResponse, orgRoleRank } from "@/lib/org-guard";
import { getUserAvatar } from "@/lib/user-avatar";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/[id]/members
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await routeParams(ctx);
  try {
    await requireOrgAccess(req, id, "viewer");
    const sb = sbAdmin();

    const { data: rawMembers, error } = await sb
      .from("organization_members")
      .select("user_id, role, status, joined_at")
      .eq("org_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const memberIds = (rawMembers ?? []).map((m: any) => m.user_id as string);
    let userMap: Record<string, { email: string; full_name: string; avatar_url: string | null }> = {};
    if (memberIds.length) {
      const [{ data: { users } }, { data: profiles }] = await Promise.all([
        sb.auth.admin.listUsers({ perPage: 1000 }),
        sb.from("profiles").select("user_id, avatar_url").in("user_id", memberIds).then((r) => r, () => ({ data: null })),
      ]);
      const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id as string, p]));
      for (const u of users) {
        if (memberIds.includes(u.id)) {
          const profile = profileByUser.get(u.id) ?? null;
          userMap[u.id] = {
            email: u.email ?? "",
            full_name: (u.user_metadata?.full_name as string) ?? (u.email?.split("@")[0] ?? ""),
            avatar_url: getUserAvatar(profile, { user_metadata: u.user_metadata ?? null }),
          };
        }
      }
    }

    const members = (rawMembers ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      email: userMap[m.user_id]?.email ?? "",
      full_name: userMap[m.user_id]?.full_name ?? "",
      avatar_url: userMap[m.user_id]?.avatar_url ?? null,
    }));

    return NextResponse.json({ members });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// POST /api/v1/organizations/[id]/members — invite/add member by email
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await routeParams(ctx);
  try {
    const { userId: actorId, role: actorRole } = await requireOrgAccess(req, id, "admin");
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "E-posta zorunlu." }, { status: 400 });

    const memberRole = validateMemberRole(body.role);
    // Only owner can assign admin role
    if (memberRole === "admin" && actorRole !== "owner") {
      return NextResponse.json({ error: "Admin rolü atamak için owner yetkisi gerekli." }, { status: 403 });
    }

    const sb = sbAdmin();

    // Find user by email in auth
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = users.find(u => u.email?.toLowerCase() === email);

    if (targetUser) {
      // Check not already a member
      const { data: existing } = await sb
        .from("organization_members")
        .select("role, status")
        .eq("org_id", id)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === "active") {
          return NextResponse.json({ error: "Kullanıcı zaten üye." }, { status: 409 });
        }
        // Re-activate suspended member
        await sb.from("organization_members")
          .update({ status: "active", role: memberRole, invited_by: actorId, joined_at: new Date().toISOString() })
          .eq("org_id", id)
          .eq("user_id", targetUser.id);
        return NextResponse.json({ added: true, user_id: targetUser.id });
      }

      const { error: insertErr } = await sb.from("organization_members").insert({
        org_id: id,
        user_id: targetUser.id,
        role: memberRole,
        invited_by: actorId,
      });
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
      return NextResponse.json({ added: true, user_id: targetUser.id }, { status: 201 });
    }

    // User not found — create invite
    const { data: invite, error: invErr } = await sb
      .from("organization_invites")
      .upsert(
        { org_id: id, email, role: memberRole, invited_by: actorId, accepted_at: null, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString() },
        { onConflict: "org_id,email", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });
    return NextResponse.json({ invited: true, invite_id: invite.id, token: invite.token }, { status: 201 });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, authRequest } from "@/lib/server/api-helpers";
import { requireOrgAccess, orgErrorResponse } from "@/lib/org-guard";
import { getUserAvatar } from "@/lib/user-avatar";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/[id] — org detail + members + pending invites
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { role } = await requireOrgAccess(req, id, "viewer");
    const sb = sbAdmin();

    const [{ data: org }, { data: rawMembers }] = await Promise.all([
      sb.from("organizations").select("*").eq("id", id).single(),
      sb.from("organization_members").select("user_id, role, status, joined_at, invited_by").eq("org_id", id),
    ]);

    if (!org) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    // Pending invitation addresses are management data. Editors and viewers
    // can inspect the team, but must not fetch or receive invite records.
    let invites: Array<{
      id: string;
      email: string;
      role: string;
      expires_at: string;
      created_at: string;
      accepted_at: string | null;
    }> = [];
    if (role === "owner" || role === "admin") {
      const { data } = await sb.from("organization_invites")
        .select("id, email, role, expires_at, created_at, accepted_at")
        .eq("org_id", id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString());
      invites = data ?? [];
    }

    // Enrich members with email/full_name/avatar from auth + profiles.
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

    return NextResponse.json({
      organization: org,
      members,
      invites,
      my_role: role,
    });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// PUT /api/v1/organizations/[id] — update org name/logo (admin+)
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await requireOrgAccess(req, id, "admin");
    const body = await req.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.logo_url !== undefined) patch.logo_url = body.logo_url ?? null;
    // White-label ayarları: public menu/booking/feedback landing sayfalarının
    // bu organizasyon adına özel marka göstermesi için (bkz. lib/organizations/branding.ts).
    if (body.brand_name !== undefined) patch.brand_name = body.brand_name ? String(body.brand_name).trim() : null;
    if (body.brand_logo_url !== undefined) patch.brand_logo_url = body.brand_logo_url ?? null;
    if (body.brand_primary_color !== undefined) {
      const color = body.brand_primary_color ? String(body.brand_primary_color).trim() : null;
      if (color && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
        return NextResponse.json({ error: "brand_primary_color geçerli bir hex renk olmalı (örn. #7c3aed)." }, { status: 400 });
      }
      patch.brand_primary_color = color;
    }

    const sb = sbAdmin();
    const { data, error } = await sb
      .from("organizations")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ organization: data });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// DELETE /api/v1/organizations/[id] — delete org (owner only)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const auth = await authRequest(req);
    if (!auth) throw new Error("Unauthorized");
    await requireOrgAccess(req, id, "owner");

    const sb = sbAdmin();
    const { error } = await sb.from("organizations").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

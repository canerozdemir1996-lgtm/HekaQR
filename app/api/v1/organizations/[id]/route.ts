import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, authRequest, routeParams } from "@/lib/server/api-helpers";
import { requireOrgAccess, orgErrorResponse } from "@/lib/org-guard";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/[id] — org detail + members + pending invites
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await routeParams(ctx);
  try {
    const { userId, role } = await requireOrgAccess(req, id, "viewer");
    const sb = sbAdmin();

    const [{ data: org }, { data: rawMembers }, { data: invites }] = await Promise.all([
      sb.from("organizations").select("*").eq("id", id).single(),
      sb.from("organization_members").select("user_id, role, status, joined_at, invited_by").eq("org_id", id),
      sb.from("organization_invites")
        .select("id, email, role, expires_at, created_at, accepted_at")
        .eq("org_id", id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);

    if (!org) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    // Enrich members with email/full_name from auth
    const memberIds = (rawMembers ?? []).map((m: any) => m.user_id as string);
    let userMap: Record<string, { email: string; full_name: string }> = {};
    if (memberIds.length) {
      const { data: { users } } = await sbAdmin().auth.admin.listUsers({ perPage: 1000 });
      for (const u of users) {
        if (memberIds.includes(u.id)) {
          userMap[u.id] = {
            email: u.email ?? "",
            full_name: (u.user_metadata?.full_name as string) ?? (u.email?.split("@")[0] ?? ""),
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
    }));

    return NextResponse.json({
      organization: org,
      members,
      invites: invites ?? [],
      my_role: role,
    });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// PUT /api/v1/organizations/[id] — update org name/logo (admin+)
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await routeParams(ctx);
  try {
    await requireOrgAccess(req, id, "admin");
    const body = await req.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.logo_url !== undefined) patch.logo_url = body.logo_url ?? null;

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
  const { id } = await routeParams(ctx);
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

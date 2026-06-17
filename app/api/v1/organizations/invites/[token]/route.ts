import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, authRequest, routeParams } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/v1/organizations/invites/[token] — preview invite (who invited, org name, role)
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await routeParams(ctx);
  const sb = sbAdmin();

  const { data: invite, error } = await sb
    .from("organization_invites")
    .select("id, email, role, expires_at, accepted_at, org_id, organizations(id, name, slug, logo_url)")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return NextResponse.json({ error: "Davet bulunamadı." }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "Bu davet zaten kabul edildi." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Davet süresi doldu." }, { status: 410 });

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      organization: (invite as any).organizations,
    },
  });
}

// POST /api/v1/organizations/invites/[token] — accept invite (must be logged in)
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await routeParams(ctx);

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();

  const { data: invite, error } = await sb
    .from("organization_invites")
    .select("id, email, role, expires_at, accepted_at, org_id, invited_by")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return NextResponse.json({ error: "Davet bulunamadı." }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "Bu davet zaten kabul edildi." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Davet süresi doldu." }, { status: 410 });

  // Verify the logged-in user's email matches the invite
  const { data: { user } } = await sb.auth.admin.getUserById(auth.userId);
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: "Bu davet farklı bir e-posta adresine gönderildi." }, { status: 403 });
  }

  // Check already a member
  const { data: existing } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", invite.org_id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existing?.status === "active") {
    // Mark invite accepted anyway and return success
    await sb.from("organization_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    return NextResponse.json({ success: true, already_member: true, org_id: invite.org_id });
  }

  // Add as member
  const { error: memberErr } = await sb.from("organization_members").upsert(
    {
      org_id: invite.org_id,
      user_id: auth.userId,
      role: invite.role,
      invited_by: invite.invited_by,
      joined_at: new Date().toISOString(),
      status: "active",
    },
    { onConflict: "org_id,user_id" }
  );

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });

  // Mark invite accepted
  await sb.from("organization_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ success: true, org_id: invite.org_id });
}

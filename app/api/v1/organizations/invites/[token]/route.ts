import { NextRequest, NextResponse } from "next/server";
import { sbAdmin, authRequest, routeParams } from "@/lib/server/api-helpers";
import { assertCanAddOrganizationMember, getOrganizationSeatUsage } from "@/lib/check-plan";
import { withOrganizationSeatLock } from "@/lib/server/organization-invites";

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

  return withOrganizationSeatLock(invite.org_id, async () => {
    // The token may have been rotated or accepted while this request waited.
    // Re-read it after acquiring the process-local seat lock.
    const { data: currentInvite, error: currentInviteError } = await sb
      .from("organization_invites")
      .select("id, email, role, expires_at, accepted_at, org_id, invited_by")
      .eq("id", invite.id)
      .eq("token", token)
      .maybeSingle();
    if (currentInviteError || !currentInvite) {
      return NextResponse.json({ error: "Davet bulunamadı veya yenilendi." }, { status: 404 });
    }
    if (currentInvite.accepted_at) {
      return NextResponse.json({ error: "Bu davet zaten kabul edildi." }, { status: 410 });
    }
    if (new Date(currentInvite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Davet süresi doldu." }, { status: 410 });
    }

    const { data: organization, error: organizationError } = await sb
      .from("organizations")
      .select("owner_id")
      .eq("id", currentInvite.org_id)
      .maybeSingle();
    if (organizationError || !organization?.owner_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı." }, { status: 404 });
    }

    const { data: existing, error: existingError } = await sb
      .from("organization_members")
      .select("role, status, invited_by, joined_at")
      .eq("org_id", currentInvite.org_id)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

    const acceptedAt = new Date().toISOString();
    if (existing?.status === "active") {
      const { data: acceptedInvite, error: acceptError } = await sb
        .from("organization_invites")
        .update({ accepted_at: acceptedAt })
        .eq("id", currentInvite.id)
        .eq("token", token)
        .is("accepted_at", null)
        .select("id")
        .maybeSingle();
      if (acceptError || !acceptedInvite) {
        return NextResponse.json({ error: acceptError?.message ?? "Davet artık geçerli değil." }, { status: 409 });
      }
      return NextResponse.json({ success: true, already_member: true, org_id: currentInvite.org_id });
    }

    let planInfo;
    try {
      // The invite itself already reserves one seat, so exclude only this
      // address while counting every other active member and pending invite.
      planInfo = await assertCanAddOrganizationMember(organization.owner_id, currentInvite.org_id, {
        includePendingInvites: true,
        excludeInviteEmail: currentInvite.email,
      });
    } catch (error) {
      const e = error as Error & { code?: string };
      return NextResponse.json(
        { error: e.message, code: e.code ?? "PLAN_LIMIT" },
        { status: e.code === "TEAM_SEAT_LIMIT_REACHED" ? 402 : 500 },
      );
    }

    const joinedAt = new Date().toISOString();
    const { error: memberErr } = await sb.from("organization_members").upsert(
      {
        org_id: currentInvite.org_id,
        user_id: auth.userId,
        role: currentInvite.role,
        invited_by: currentInvite.invited_by,
        joined_at: joinedAt,
        status: "active",
      },
      { onConflict: "org_id,user_id" },
    );
    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });

    const rollbackMember = async () => existing
      ? sb.from("organization_members")
        .update({
          role: existing.role,
          status: existing.status,
          invited_by: existing.invited_by,
          joined_at: existing.joined_at,
        })
        .eq("org_id", currentInvite.org_id)
        .eq("user_id", auth.userId)
      : sb.from("organization_members")
        .delete()
        .eq("org_id", currentInvite.org_id)
        .eq("user_id", auth.userId);

    try {
      const limit = planInfo.limits.org_members;
      if (limit !== -1) {
        const usage = await getOrganizationSeatUsage(currentInvite.org_id, {
          includePendingInvites: true,
          excludeInviteEmail: currentInvite.email,
        });
        if (usage.usedSeats > limit) {
          const rollback = await rollbackMember();
          if (rollback.error) throw new Error(`Koltuk kotası geri alma hatası: ${rollback.error.message}`);
          return NextResponse.json({
            error: `Planınızdaki ekip üyesi limiti (${limit}) doldu.`,
            code: "TEAM_SEAT_LIMIT_REACHED",
          }, { status: 402 });
        }
      }

      const { data: acceptedInvite, error: acceptError } = await sb
        .from("organization_invites")
        .update({ accepted_at: acceptedAt })
        .eq("id", currentInvite.id)
        .eq("token", token)
        .is("accepted_at", null)
        .select("id")
        .maybeSingle();
      if (acceptError || !acceptedInvite) {
        throw new Error(acceptError?.message ?? "Davet kabul durumu kaydedilemedi.");
      }
    } catch (error) {
      // Do not leave an active member behind if quota verification or invite
      // finalization fails after the member write.
      const rollback = await rollbackMember();
      if (rollback.error) {
        return NextResponse.json({
          error: `Davet kabulü ve koltuk geri alma işlemi başarısız: ${rollback.error.message}`,
        }, { status: 500 });
      }
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, org_id: currentInvite.org_id });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/server/api-helpers";
import { requireOrgAccess, validateMemberRole, orgErrorResponse, orgRoleRank } from "@/lib/org-guard";
import { getUserAvatar } from "@/lib/user-avatar";
import {
  assertCanAddOrganizationMember,
  getOrganizationSeatUsage,
  type OrganizationSeatUsageOptions,
  type UserPlanInfo,
} from "@/lib/check-plan";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { sendOwnerNotificationEmail } from "@/lib/email/resend";
import {
  createOrganizationInviteToken,
  ORGANIZATION_INVITE_TTL_MS,
  withOrganizationSeatLock,
} from "@/lib/server/organization-invites";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildInvitationEmailHtml(input: { organizationName: string; inviteUrl: string; role: string }) {
  const organizationName = escapeHtml(input.organizationName);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const role = escapeHtml(input.role);

  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;padding:32px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7c3aed;">QR Publish</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${organizationName} ekibine davet edildiniz</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#475569;">
      Organizasyona <strong>${role}</strong> rolüyle katılmak için aşağıdaki bağlantıyı kullanın. Davet bağlantısı 7 gün geçerlidir.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;border-radius:12px;background:#7c3aed;padding:12px 20px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">Daveti görüntüle</a>
    <p style="margin:24px 0 6px;font-size:12px;color:#64748b;">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:</p>
    <p style="margin:0;word-break:break-all;font-size:12px;color:#475569;">${inviteUrl}</p>
  </div>
</body>
</html>`;
}

type SeatCheckResult =
  | { ok: true; planInfo: UserPlanInfo }
  | { ok: false; response: NextResponse };

async function requireOrganizationSeat(
  ownerId: string,
  organizationId: string,
  options: OrganizationSeatUsageOptions = {},
): Promise<SeatCheckResult> {
  try {
    return {
      ok: true,
      planInfo: await assertCanAddOrganizationMember(ownerId, organizationId, options),
    };
  } catch (error) {
    const e = error as Error & { code?: string };
    return {
      ok: false,
      response: NextResponse.json(
        { error: e.message, code: e.code ?? "PLAN_LIMIT" },
        { status: e.code === "TEAM_SEAT_LIMIT_REACHED" ? 402 : 500 },
      ),
    };
  }
}

function seatLimitResponse(limit: number) {
  return NextResponse.json({
    error: `Planınızdaki ekip üyesi limiti (${limit}) doldu.`,
    code: "TEAM_SEAT_LIMIT_REACHED",
  }, { status: 402 });
}

// GET /api/v1/organizations/[id]/members
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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
  const { id } = await ctx.params;
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
    const { data: organization } = await sb.from("organizations").select("owner_id, name").eq("id", id).maybeSingle();
    if (!organization?.owner_id) return NextResponse.json({ error: "Organizasyon bulunamadı." }, { status: 404 });
    // Find user by email in auth
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = users.find(u => u.email?.toLowerCase() === email);

    if (targetUser) {
      return withOrganizationSeatLock(id, async () => {
        // Re-read membership after taking the process-local lock so two requests
        // cannot both make a decision from the same stale state.
        const { data: existing, error: existingError } = await sb
          .from("organization_members")
          .select("role, status, invited_by, joined_at")
          .eq("org_id", id)
          .eq("user_id", targetUser.id)
          .maybeSingle();
        if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
        if (existing?.status === "active") {
          return NextResponse.json({ error: "Kullanıcı zaten üye." }, { status: 409 });
        }

        const seat = await requireOrganizationSeat(organization.owner_id, id, {
          includePendingInvites: true,
          excludeInviteEmail: email,
        });
        if (!seat.ok) return seat.response;

        const joinedAt = new Date().toISOString();
        const mutation = existing
          ? await sb.from("organization_members")
            .update({ status: "active", role: memberRole, invited_by: actorId, joined_at: joinedAt })
            .eq("org_id", id)
            .eq("user_id", targetUser.id)
          : await sb.from("organization_members").insert({
            org_id: id,
            user_id: targetUser.id,
            role: memberRole,
            invited_by: actorId,
            joined_at: joinedAt,
            status: "active",
          });
        if (mutation.error) return NextResponse.json({ error: mutation.error.message }, { status: 400 });

        try {
          const limit = seat.planInfo.limits.org_members;
          if (limit !== -1) {
            const usage = await getOrganizationSeatUsage(id, {
              includePendingInvites: true,
              excludeInviteEmail: email,
            });
            if (usage.usedSeats > limit) {
              const rollback = existing
                ? await sb.from("organization_members")
                  .update({
                    role: existing.role,
                    status: existing.status,
                    invited_by: existing.invited_by,
                    joined_at: existing.joined_at,
                  })
                  .eq("org_id", id)
                  .eq("user_id", targetUser.id)
                : await sb.from("organization_members")
                  .delete()
                  .eq("org_id", id)
                  .eq("user_id", targetUser.id);
              if (rollback.error) throw new Error(`Koltuk kotası geri alma hatası: ${rollback.error.message}`);
              return seatLimitResponse(limit);
            }
          }
        } catch (error) {
          // A failed post-write verification must fail closed. Revert the new
          // active seat before surfacing the database error.
          const rollback = existing
            ? await sb.from("organization_members")
              .update({
                role: existing.role,
                status: existing.status,
                invited_by: existing.invited_by,
                joined_at: existing.joined_at,
              })
              .eq("org_id", id)
              .eq("user_id", targetUser.id)
            : await sb.from("organization_members")
              .delete()
              .eq("org_id", id)
              .eq("user_id", targetUser.id);
          if (rollback.error) {
            throw new Error(`Koltuk doğrulama ve geri alma hatası: ${rollback.error.message}`);
          }
          throw error;
        }

        // If this address had an older pending invite, make it unusable once
        // the account has been added directly.
        await sb.from("organization_invites")
          .update({ accepted_at: joinedAt })
          .eq("org_id", id)
          .eq("email", email)
          .is("accepted_at", null);

        return NextResponse.json(
          { added: true, user_id: targetUser.id },
          { status: existing ? 200 : 201 },
        );
      });
    }

    // User not found — reserve a seat and create/rotate the invitation.
    const inviteMutation = await withOrganizationSeatLock(id, async () => {
      const { data: previousInvite, error: previousInviteError } = await sb
        .from("organization_invites")
        .select("id, token, role, invited_by, expires_at, accepted_at")
        .eq("org_id", id)
        .eq("email", email)
        .maybeSingle();
      if (previousInviteError) {
        return { response: NextResponse.json({ error: previousInviteError.message }, { status: 400 }) };
      }

      const seat = await requireOrganizationSeat(organization.owner_id, id, {
        includePendingInvites: true,
        excludeInviteEmail: email,
      });
      if (!seat.ok) return { response: seat.response };

      const token = createOrganizationInviteToken();
      const expiresAt = new Date(Date.now() + ORGANIZATION_INVITE_TTL_MS).toISOString();
      const { data: invite, error: invErr } = await sb
        .from("organization_invites")
        .upsert(
          {
            org_id: id,
            email,
            role: memberRole,
            invited_by: actorId,
            token,
            accepted_at: null,
            expires_at: expiresAt,
          },
          { onConflict: "org_id,email", ignoreDuplicates: false },
        )
        .select("id, token")
        .single();
      if (invErr || !invite) {
        return { response: NextResponse.json({ error: invErr?.message ?? "Davet oluşturulamadı." }, { status: 400 }) };
      }

      try {
        const limit = seat.planInfo.limits.org_members;
        if (limit !== -1) {
          const usage = await getOrganizationSeatUsage(id, { includePendingInvites: true });
          if (usage.usedSeats > limit) {
            const rollback = previousInvite
              ? await sb.from("organization_invites")
                .update({
                  token: previousInvite.token,
                  role: previousInvite.role,
                  invited_by: previousInvite.invited_by,
                  expires_at: previousInvite.expires_at,
                  accepted_at: previousInvite.accepted_at,
                })
                .eq("id", previousInvite.id)
                .eq("token", token)
              : await sb.from("organization_invites")
                .delete()
                .eq("id", invite.id)
                .eq("token", token)
                .is("accepted_at", null);
            if (rollback.error) throw new Error(`Davet kotası geri alma hatası: ${rollback.error.message}`);
            return { response: seatLimitResponse(limit) };
          }
        }
      } catch (error) {
        const rollback = previousInvite
          ? await sb.from("organization_invites")
            .update({
              token: previousInvite.token,
              role: previousInvite.role,
              invited_by: previousInvite.invited_by,
              expires_at: previousInvite.expires_at,
              accepted_at: previousInvite.accepted_at,
            })
            .eq("id", previousInvite.id)
            .eq("token", token)
          : await sb.from("organization_invites")
            .delete()
            .eq("id", invite.id)
            .eq("token", token)
            .is("accepted_at", null);
        if (rollback.error) {
          throw new Error(`Davet kotası doğrulama ve geri alma hatası: ${rollback.error.message}`);
        }
        throw error;
      }

      return { invite };
    });
    if ("response" in inviteMutation) return inviteMutation.response;
    const { invite } = inviteMutation;

    const inviteUrl = `${getPublicAppOrigin(req.nextUrl.origin)}/invite/${encodeURIComponent(invite.token)}`;
    const subject = `${organization.name} ekibine davet edildiniz`;
    const html = buildInvitationEmailHtml({
      organizationName: organization.name,
      inviteUrl,
      role: memberRole,
    });

    // Delivery is best effort. The invite remains usable and the management UI
    // receives a copy-link fallback when neither configured provider can send.
    const smtpResult = await sendSmtpEmail({ to: email, subject, html });
    let sent = smtpResult.sent;
    let deliveryProvider: "smtp" | "resend" | null = sent ? "smtp" : null;
    if (!sent) {
      const resendResult = await sendOwnerNotificationEmail({ to: email, subject, html });
      sent = resendResult.sent;
      if (sent) deliveryProvider = "resend";
    }

    return NextResponse.json({
      invited: true,
      invite_id: invite.id,
      invite_url: inviteUrl,
      delivery: sent ? "sent" : "copy_link",
      delivery_provider: deliveryProvider,
    }, { status: 201 });
  } catch (err) {
    const { error, status } = orgErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

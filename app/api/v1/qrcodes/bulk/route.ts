import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { logAuditEvent } from "@/lib/middleware/auditLog";

export const dynamic = "force-dynamic";

const ORG_ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

async function getOrgRole(sb: ReturnType<typeof sbAdmin>, userId: string, orgId: string | null | undefined) {
  if (!orgId) return null;
  const { data, error } = await sb
    .from("organization_members")
    .select("role, status")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") return null;
  return data.role as string;
}

async function canEditQr(sb: ReturnType<typeof sbAdmin>, userId: string, qr: { user_id?: string | null; organization_id?: string | null }) {
  if (qr.user_id === userId) return true;
  const role = await getOrgRole(sb, userId, qr.organization_id);
  return Boolean(role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.editor);
}

async function canDeleteQr(sb: ReturnType<typeof sbAdmin>, userId: string, qr: { user_id?: string | null; organization_id?: string | null }) {
  if (qr.user_id === userId) return true;
  const role = await getOrgRole(sb, userId, qr.organization_id);
  return Boolean(role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin);
}

const TRASH_TAG = "__trash";
const TRASH_AT_PREFIX = "__trash_at:";

function trashTags(tags: string[] | null | undefined) {
  const base = (tags ?? []).filter((tag) => tag !== TRASH_TAG && !tag.startsWith(TRASH_AT_PREFIX));
  return [...base, TRASH_TAG, `${TRASH_AT_PREFIX}${new Date().toISOString()}`];
}

export async function POST(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
    const action = String(body.action || "");
    const folderId = typeof body.folderId === "string" ? body.folderId : null;

    if (!ids.length) return NextResponse.json({ error: "En az bir QR seçilmelidir." }, { status: 400 });
    if (!["delete", "activate", "deactivate", "move"].includes(action)) {
      return NextResponse.json({ error: "Geçersiz bulk action." }, { status: 400 });
    }

    const sb = sbAdmin();
    const { data: qrs, error } = await sb
      .from("qr_codes")
      .select("id, user_id, organization_id, tags")
      .in("id", ids)
      .returns<Array<{ id: string; user_id: string | null; organization_id: string | null; tags?: string[] | null }>>();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!qrs?.length) return NextResponse.json({ error: "QR kayıtları bulunamadı." }, { status: 404 });

    const authorizationChecks = await Promise.all(
      qrs.map(async (qr) => ({
        id: qr.id,
        allowed: action === "delete"
          ? await canDeleteQr(sb, auth.userId, qr)
          : await canEditQr(sb, auth.userId, qr),
      })),
    );

    const denied = authorizationChecks.filter((row) => !row.allowed);
    if (denied.length > 0) {
      return NextResponse.json({ error: "Seçilen kayıtların bazılarında yetkiniz yok." }, { status: 403 });
    }

    const patch =
      action === "activate"
          ? { is_active: true, updated_at: new Date().toISOString() }
          : action === "deactivate"
            ? { is_active: false, updated_at: new Date().toISOString() }
            : { folder_id: folderId, updated_at: new Date().toISOString() };

    const updateError = action === "delete"
      ? (
        await Promise.all(
          qrs.map((qr) =>
            sb
              .from("qr_codes")
              .update({ tags: trashTags(qr.tags), is_active: false, updated_at: new Date().toISOString() })
              .eq("id", qr.id),
          ),
        )
      ).find((result) => result.error)?.error
      : (await sb.from("qr_codes").update(patch).in("id", ids)).error;
    if (updateError) {
      void logAuditEvent(sb, {
        user_id: auth.userId,
        action: `bulk_${action}`,
        resource: "qr_code",
        status: "failure",
        status_code: 400,
        details: { count: ids.length },
      });
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    void logAuditEvent(sb, {
      user_id: auth.userId,
      action: `bulk_${action}`,
      resource: "qr_code",
      status: "success",
      details: { count: ids.length, folder_id: folderId },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bulk işlem tamamlanamadı." }, { status: 500 });
  }
}

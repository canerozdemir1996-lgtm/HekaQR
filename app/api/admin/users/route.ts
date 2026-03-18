import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanMutateUser, getTargetRole, requireAdminOrOwner } from "@/lib/admin-guard";
import type { AppRole } from "@/lib/auth";

function getAdminSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/admin/users
export async function GET(req: NextRequest) {
  try {
    const { sbAdmin: sb } = await requireAdminOrOwner(req);
    const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get QR + scan counts per user
    const { data: qrData } = await sb
      .from("qr_codes")
      .select("user_id, scan_count");

    const qrByUser: Record<string, { qr: number; scans: number }> = {};
    for (const q of qrData ?? []) {
      const uid = q.user_id as string;
      if (!uid) continue;
      if (!qrByUser[uid]) qrByUser[uid] = { qr: 0, scans: 0 };
      qrByUser[uid].qr++;
      qrByUser[uid].scans += q.scan_count ?? 0;
    }

    const result = users.map(u => ({
      id: u.id,
      email: u.email ?? "",
      full_name: (u.user_metadata?.full_name as string) ?? "",
      role: (u.user_metadata?.role as string) ?? "user",
      is_active: !u.banned_until,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      qr_count: qrByUser[u.id]?.qr ?? 0,
      scan_count: qrByUser[u.id]?.scans ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// POST /api/admin/users  → create
export async function POST(req: NextRequest) {
  try {
    const { actor, sbAdmin: sb } = await requireAdminOrOwner(req);
    const { email, full_name, role, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "E-posta ve şifre zorunlu" }, { status: 400 });

    const requestedRole = (role ?? "user") as AppRole;
    // Admins can only create normal users
    if (actor.role === "admin" && requestedRole !== "user") {
      return NextResponse.json({ error: "Admin yalnızca 'user' hesabı oluşturabilir." }, { status: 403 });
    }

    const { data, error } = await sb.auth.admin.createUser({
      email, password,
      user_metadata: { full_name: full_name ?? "", role: requestedRole, must_change_password: true },
      email_confirm: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ user: data.user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// PATCH /api/admin/users → update
export async function PATCH(req: NextRequest) {
  try {
    const { actor, sbAdmin: sb } = await requireAdminOrOwner(req);
    const { id, full_name, role, password, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

    const targetRole = await getTargetRole(sb, id);
    const wantsBanChange = typeof is_active === "boolean";
    const requestedRole = role !== undefined ? (role as AppRole) : undefined;

    // Owner cannot be banned/disabled (safety)
    if (wantsBanChange && targetRole === "owner") {
      return NextResponse.json({ error: "Owner hesabı pasife alınamaz (banlanamaz)." }, { status: 403 });
    }

    assertCanMutateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: id,
      targetRole,
      requestedRole,
      wantsBanChange,
    });

    // Prevent removing/demoting the last remaining owner
    if (targetRole === "owner" && requestedRole && requestedRole !== "owner") {
      const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
      if (!listErr) {
        const ownerCount = (users ?? []).filter(u => (u.user_metadata?.role as AppRole) === "owner").length;
        if (ownerCount <= 1) {
          return NextResponse.json({ error: "Sistemde en az 1 adet Owner kalmak zorunda." }, { status: 403 });
        }
      }
    }

    // eslint-disable-next-line
    const payload: Record<string, any> = {
      user_metadata: { full_name, role: requestedRole },
    };
    if (password) {
      payload.password = password;
      payload.user_metadata.must_change_password = true;
    }
    if (is_active === false) payload.ban_duration = "876600h";
    if (is_active === true)  payload.ban_duration = "none";

    const { error } = await sb.auth.admin.updateUserById(id, payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status =
      msg === "Unauthorized" ? 401 :
      msg === "Forbidden" ? 403 :
      msg.includes("yetkisi gerekli") || msg.includes("işlem yapamaz") ? 403 :
      500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/admin/users?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { actor, sbAdmin: sb } = await requireAdminOrOwner(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

    const targetRole = await getTargetRole(sb, id);
    assertCanMutateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: id,
      targetRole,
      wantsDelete: true,
    });

    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

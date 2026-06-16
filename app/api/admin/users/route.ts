import { NextRequest, NextResponse } from "next/server";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminUpdateUser,
  normalizeAppRole,
  type AppRole,
} from "@/lib/auth";
import { getTargetRole, requireAdminOrOwner, assertCanMutateUser } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

function statusFromError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  if (
    message.includes("System Owner") ||
    message.includes("rol") ||
    message.includes("Admin,") ||
    message.includes("Kendi")
  ) return 403;
  return 500;
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: statusFromError(error) });
}

async function loadUsers(sbAdmin: Awaited<ReturnType<typeof requireAdminOrOwner>>["sbAdmin"]) {
  const baseUsers = await adminListUsers();
  const { data: qrs } = await sbAdmin
    .from("qr_codes")
    .select("user_id, scan_count");

  const stats = new Map<string, { qr_count: number; scan_count: number }>();
  for (const qr of qrs ?? []) {
    const userId = qr.user_id as string | null;
    if (!userId) continue;
    const row = stats.get(userId) ?? { qr_count: 0, scan_count: 0 };
    row.qr_count += 1;
    row.scan_count += Number(qr.scan_count ?? 0);
    stats.set(userId, row);
  }

  return baseUsers.map(user => {
    const userStats = stats.get(user.id) ?? { qr_count: 0, scan_count: 0 };
    return {
      ...user,
      ...userStats,
      qrs: userStats.qr_count,
      scans: userStats.scan_count,
      status: user.is_active ? "Active" : "Inactive",
      is_online: false,
      last_seen_at: null,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { sbAdmin } = await requireAdminOrOwner(req);
    const users = await loadUsers(sbAdmin);
    const metrics = {
      users: users.length,
      qrs: users.reduce((sum, user) => sum + user.qr_count, 0),
      scans: users.reduce((sum, user) => sum + user.scan_count, 0),
    };
    const usersList = users
      .map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.is_active ? "Active" : "Inactive",
        qrs: user.qr_count,
        scans: user.scan_count,
        last_sign_in: user.last_sign_in,
      }))
      .sort((a, b) => new Date(b.last_sign_in || 0).getTime() - new Date(a.last_sign_in || 0).getTime());

    return NextResponse.json({ users, usersList, metrics });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireAdminOrOwner(req);
    const body = await req.json();
    const role = normalizeAppRole(body.role);

    if (actor.role !== "owner" && role !== "user") {
      throw new Error("Admin rol atayamaz.");
    }
    if (role === "owner" && actor.role !== "owner") {
      throw new Error("Bu işlem için System Owner yetkisi gerekli.");
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    if (!email) throw new Error("E-posta zorunlu.");
    if (password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");

    const user = await adminCreateUser(email, password, fullName, role);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    const body = await req.json();
    const targetId = String(body.id ?? "");
    if (!targetId) throw new Error("Kullanıcı id zorunlu.");

    const targetRole = await getTargetRole(sbAdmin, targetId);
    const requestedRole = body.role === undefined ? undefined : normalizeAppRole(body.role);
    assertCanMutateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId,
      targetRole,
      requestedRole,
      wantsBanChange: typeof body.is_active === "boolean",
    });

    const updates: {
      full_name?: string;
      role?: AppRole;
      is_active?: boolean;
      password?: string;
    } = {};
    if (body.full_name !== undefined) updates.full_name = String(body.full_name ?? "").trim();
    if (requestedRole) updates.role = requestedRole;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (body.password) {
      const password = String(body.password);
      if (password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
      updates.password = password;
    }

    await adminUpdateUser(targetId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { actor, sbAdmin } = await requireAdminOrOwner(req);
    const targetId = req.nextUrl.searchParams.get("id") ?? "";
    if (!targetId) throw new Error("Kullanıcı id zorunlu.");

    const targetRole = await getTargetRole(sbAdmin, targetId);
    assertCanMutateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId,
      targetRole,
      wantsDelete: true,
    });

    await adminDeleteUser(targetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

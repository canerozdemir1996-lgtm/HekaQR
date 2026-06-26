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

// 5 dakika içinde görülen kullanıcılar "online" kabul edilir.
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

async function loadUsers(sbAdmin: Awaited<ReturnType<typeof requireAdminOrOwner>>["sbAdmin"]) {
  const baseUsers = await adminListUsers();

  const [qrResult, settingsResult, presenceResult] = await Promise.all([
    sbAdmin.from("qr_codes").select("user_id, scan_count"),
    sbAdmin
      .from("user_settings")
      .select("user_id, current_plan, billing_cycle, subscription_status, plan_expires_at")
      .then((r) => r, () => ({ data: null })),
    // user_presence tablosu yoksa (migration henüz çalışmadıysa) hata yutulur.
    sbAdmin
      .from("user_presence")
      .select("user_id, last_seen_at")
      .then((r) => r, () => ({ data: null })),
  ]);

  const stats = new Map<string, { qr_count: number; scan_count: number }>();
  for (const qr of qrResult.data ?? []) {
    const userId = qr.user_id as string | null;
    if (!userId) continue;
    const row = stats.get(userId) ?? { qr_count: 0, scan_count: 0 };
    row.qr_count += 1;
    row.scan_count += Number(qr.scan_count ?? 0);
    stats.set(userId, row);
  }

  const planByUser = new Map<string, {
    current_plan: string;
    billing_cycle: string;
    subscription_status: string;
    plan_expires_at: string | null;
  }>();
  for (const s of (settingsResult as any).data ?? []) {
    planByUser.set(s.user_id as string, {
      current_plan: (s.current_plan as string) ?? "free",
      billing_cycle: (s.billing_cycle as string) ?? "monthly",
      subscription_status: (s.subscription_status as string) ?? "free",
      plan_expires_at: (s.plan_expires_at as string | null) ?? null,
    });
  }

  // Kullanıcı presence verisi — tablo yoksa boş map ile devam et
  const presenceByUser = new Map<string, string>();
  for (const p of (presenceResult as any).data ?? []) {
    if (p.user_id && p.last_seen_at) presenceByUser.set(p.user_id as string, p.last_seen_at as string);
  }

  const now = Date.now();
  return baseUsers.map(user => {
    const userStats = stats.get(user.id) ?? { qr_count: 0, scan_count: 0 };
    const planInfo = planByUser.get(user.id) ?? {
      current_plan: "free",
      billing_cycle: "monthly",
      subscription_status: "free",
      plan_expires_at: null,
    };
    const lastSeenAt = presenceByUser.get(user.id) ?? null;
    const is_online = lastSeenAt
      ? now - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS
      : false;
    return {
      ...user,
      ...userStats,
      ...planInfo,
      qrs: userStats.qr_count,
      scans: userStats.scan_count,
      status: user.is_active ? "Active" : "Inactive",
      is_online,
      last_seen_at: lastSeenAt,
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

    const VALID_PLANS = ["free", "starter", "pro", "enterprise"] as const;
    const VALID_CYCLES = ["monthly", "yearly"] as const;
    const VALID_STATUSES = ["free", "active", "trial", "expired", "cancelled"] as const;

    const wantsPlanUpdate =
      body.current_plan !== undefined ||
      body.billing_cycle !== undefined ||
      body.subscription_status !== undefined;

    if (wantsPlanUpdate) {
      const planPatch: Record<string, unknown> = { user_id: targetId, updated_at: new Date().toISOString() };
      if (body.current_plan !== undefined) {
        planPatch.current_plan = VALID_PLANS.includes(body.current_plan) ? body.current_plan : "free";
      }
      if (body.billing_cycle !== undefined) {
        planPatch.billing_cycle = VALID_CYCLES.includes(body.billing_cycle) ? body.billing_cycle : "monthly";
      }
      if (body.subscription_status !== undefined) {
        planPatch.subscription_status = VALID_STATUSES.includes(body.subscription_status) ? body.subscription_status : "free";
      }
      if (body.plan_expires_at !== undefined) {
        planPatch.plan_expires_at = body.plan_expires_at ?? null;
      }

      await sbAdmin
        .from("user_settings")
        .upsert(planPatch, { onConflict: "user_id" })
        .then((r) => r, () => null);
    }

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

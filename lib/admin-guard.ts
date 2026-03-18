import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { roleRank, type AppRole } from "@/lib/auth";

type GuardOk = {
  actor: { id: string; role: AppRole; email?: string };
  // Supabase generics are intentionally widened here to avoid build-time
  // schema generic conflicts when a generated Database type is not present.
  sbAdmin: SupabaseClient<any, any, any, any, any>;
};

function getBearerToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function requireAdminOrOwner(req: NextRequest): Promise<GuardOk> {
  const token = getBearerToken(req);
  if (!token) throw new Error("Unauthorized");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: userRes, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userRes.user) throw new Error("Unauthorized");

  const role = (userRes.user.user_metadata?.role as AppRole) ?? "user";
  if (role !== "admin" && role !== "owner") throw new Error("Forbidden");

  const sbAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  return { actor: { id: userRes.user.id, role, email: userRes.user.email ?? undefined }, sbAdmin };
}

export async function getTargetRole(sbAdmin: GuardOk["sbAdmin"], userId: string): Promise<AppRole> {
  const { data, error } = await sbAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return "user";
  return (data.user.user_metadata?.role as AppRole) ?? "user";
}

export function assertCanMutateUser(params: {
  actorId: string;
  actorRole: AppRole;
  targetId: string;
  targetRole: AppRole;
  requestedRole?: AppRole;
  wantsBanChange?: boolean;
  wantsDelete?: boolean;
}) {
  const { actorId, actorRole, targetId, targetRole, requestedRole, wantsBanChange, wantsDelete } = params;

  if (actorId === targetId) {
    if (requestedRole) throw new Error("Kendi rolünüz değiştirilemez.");
    if (wantsBanChange) throw new Error("Kendi hesabınızın durumunu değiştiremezsiniz.");
    if (wantsDelete) throw new Error("Kendi hesabınızı silemezsiniz.");
  }

  // Only owners can create/assign owner role
  if (requestedRole === "owner" && actorRole !== "owner") {
    throw new Error("Bu işlem için System Owner yetkisi gerekli.");
  }

  // Admins cannot affect admins/owners
  if (actorRole === "admin") {
    if (roleRank(targetRole) >= roleRank("admin")) {
      throw new Error("Admin, başka bir admin/owner üzerinde işlem yapamaz.");
    }
    if (requestedRole && roleRank(requestedRole) >= roleRank("admin")) {
      throw new Error("Admin rol atayamaz.");
    }
    if (wantsDelete && roleRank(targetRole) >= roleRank("admin")) {
      throw new Error("Admin, admin/owner silemez.");
    }
  }

  // Owners also shouldn't delete other owners via UI rules? Allow owner->owner delete? safer deny.
  if (actorRole === "owner" && wantsDelete && targetRole === "owner") {
    throw new Error("Owner, başka bir owner hesabını silemez.");
  }
}


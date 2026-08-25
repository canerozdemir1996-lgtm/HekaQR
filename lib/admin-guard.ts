import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { roleFromMetadata, roleRank, type AppRole } from "@/lib/auth";
import { mfaSessionIdFromAccessToken } from "@/lib/mfaCookie";

type GuardOk = {
  actor: { id: string; role: AppRole; email?: string; sessionId: string };
  // Supabase generics are intentionally widened here to avoid build-time
  // schema generic conflicts when a generated Database type is not present.
  sbAdmin: SupabaseClient<any, any, any, any, any>;
};

function getBearerToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function requireAdminOrOwner(req: NextRequest): Promise<GuardOk> {
  const token = getBearerToken(req);

  let userId: string | undefined;
  let userEmail: string | undefined;
  let role: AppRole = "user";
  let sessionId: string | null = null;

  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: userRes, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userRes.user) throw new Error("Unauthorized");

    userId = userRes.user.id;
    userEmail = userRes.user.email ?? undefined;
    role = roleFromMetadata(userRes.user);
    sessionId = mfaSessionIdFromAccessToken(token);
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    userId = user.id;
    userEmail = user.email ?? undefined;
    role = roleFromMetadata(user);
    const { data: { session } } = await supabase.auth.getSession();
    sessionId = mfaSessionIdFromAccessToken(session?.access_token);
  }

  if (!sessionId) throw new Error("Unauthorized");
  if (role !== "admin" && role !== "owner") throw new Error("Forbidden");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAdmin = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Admin API routes do not pass through the page middleware. Deny access
  // here as well, so an admin account without an enabled and verified 2FA
  // setup cannot call privileged endpoints directly.
  const { data: mfaSettings, error: mfaError } = await sbAdmin
    .from("user_mfa_settings")
    .select("mfa_enabled, verified")
    .eq("user_id", userId!)
    .maybeSingle();

  if (mfaError || !mfaSettings?.mfa_enabled || !mfaSettings?.verified) {
    throw new Error("Forbidden");
  }

  return {
    actor: { id: userId!, role, email: userEmail, sessionId },
    sbAdmin,
  };
}

export async function getTargetRole(sbAdmin: GuardOk["sbAdmin"], userId: string): Promise<AppRole> {
  const { data, error } = await sbAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return "user";
  return roleFromMetadata(data.user);
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
    // UI sometimes sends the current role back; only block if it actually changes.
    if (requestedRole && requestedRole !== targetRole) throw new Error("Kendi rolünüz değiştirilemez.");
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


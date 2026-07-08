/**
 * NextAuth-based admin authorization guard for API routes
 * Replaces requireAdminOrOwner which relied on Supabase bearer tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { createClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth";

export type GuardOk = {
  userId: string;
  email: string;
  role: AppRole;
  sbAdmin: ReturnType<typeof createAdminSupabase>;
};

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Verify NextAuth session and check admin/owner permissions
 * Replaces requireAdminOrOwner()
 */
export async function requireAdminOrOwnerNextAuth(
  req: NextRequest
): Promise<GuardOk> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  let role = (session.user.role as AppRole | undefined)
    || (session.user as any)?.raw_user_meta_data?.role
    || (session.user as any)?.user_metadata?.role;

  const sbAdmin = createAdminSupabase();

  // Fallback: force-read role from Supabase admin endpoint if session lacks it
  if (!role && session.user.id) {
    try {
      const { data, error } = await sbAdmin.auth.admin.getUserById(session.user.id);
      if (!error && data?.user?.user_metadata?.role) {
        role = data.user.user_metadata.role as AppRole;
      }
    } catch {
      // ignore
    }
  }

  role = role || "user";

  if (role !== "admin" && role !== "owner") {
    throw new Error("Forbidden");
  }


  return {
    userId: session.user.id,
    email: session.user.email || "",
    role,
    sbAdmin,
  };
}

/**
 * Get target user's role from Supabase
 */
export async function getTargetRoleNextAuth(
  sbAdmin: GuardOk["sbAdmin"],
  userId: string
): Promise<AppRole> {
  try {
    const { data, error } = await sbAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user) return "user";
    return (data.user.user_metadata?.role as AppRole) ?? "user";
  } catch {
    return "user";
  }
}

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";

export function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function authRequest(req: NextRequest): Promise<{ userId: string; role?: string } | null> {
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (key) {
    const sb = sbAdmin();
    const { data, error } = await sb
      .from("api_keys")
      .select("user_id, revoked_at")
      .eq("key_hash", sha256Hex(key))
      .maybeSingle();

    if (!error && data && !data.revoked_at) {
      await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", sha256Hex(key));
      return { userId: data.user_id as string, role: "api" };
    }
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return userId ? { userId, role: session?.user?.role } : null;
}

export async function routeParams<T extends Record<string, string>>(context: { params: Promise<T> | T }) {
  return Promise.resolve(context.params);
}

/**
 * Logs the raw Postgres/PostgREST error for diagnostics and returns a generic
 * Turkish message safe to show to end users. Never echoes `error.message`
 * (table/column/constraint names) back in the API response.
 */
export function safeDbErrorMessage(error: { message: string; code?: string }, context: string): string {
  console.error(`[${context}] database error`, { message: error.message, code: error.code });
  return "Veri yüklenemedi. Lütfen daha sonra tekrar deneyin.";
}

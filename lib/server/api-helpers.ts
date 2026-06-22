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
  const sessionId = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!sessionId && !email) return null;

  // OAuth provider IDs are not PostgreSQL UUIDs. Resolve the canonical
  // Supabase user when an earlier OAuth synchronization was interrupted.
  if (sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return { userId: sessionId, role: session?.user?.role };
  }

  if (!email) return null;
  const { data, error } = await sbAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("[authRequest] Supabase user resolution failed", { code: error.code });
    return null;
  }
  const user = data.users.find(item => item.email?.toLowerCase() === email);
  return user ? { userId: user.id, role: session?.user?.role } : null;
}

export async function routeParams<T extends Record<string, string>>(context: { params: Promise<T> | T }) {
  return Promise.resolve(context.params);
}

export function isSchemaCompatError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  return ["42703", "42p01", "pgrst204", "pgrst205"].includes(code) || [
    "column",
    "table",
    "relation",
    "schema cache",
    "does not exist",
    "could not find",
  ].some((part) => message.includes(part));
}

/**
 * Logs the raw Postgres/PostgREST error for diagnostics and returns a generic
 * Turkish message safe to show to end users. Never echoes `error.message`
 * (table/column/constraint names) back in the API response.
 */
export function safeDbErrorMessage(error: { message: string; code?: string }, context: string): string {
  console.error(`[${context}] database error`, { message: error.message, code: error.code });
  if (isSchemaCompatError(error)) {
    return "Veritabanı şeması eksik veya eski görünüyor. Migrationları uygulayıp tekrar deneyin.";
  }
  return "Veri yüklenemedi. Lütfen daha sonra tekrar deneyin.";
}

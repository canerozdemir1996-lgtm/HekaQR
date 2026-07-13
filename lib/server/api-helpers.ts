import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { roleFromMetadata } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sbAdmin: ReturnType<typeof createClient<any>> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sbAdmin(): ReturnType<typeof createClient<any>> {
  if (!_sbAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _sbAdmin = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _sbAdmin;
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
      // last_used_at güncellemesi response'u bloklamaya değmez — best-effort.
      void sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", sha256Hex(key));
      return { userId: data.user_id as string, role: "api" };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return { userId: user.id, role: roleFromMetadata(user) };
}

export async function routeParams<T extends Record<string, string>>(context: { params: Promise<T> | T }) {
  return Promise.resolve(context.params);
}

export function isSchemaCompatError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  return ["42703", "42p01", "pgrst204", "pgrst205"].includes(code)
    || /relation (?:["'][^"']+["'] )?does not exist/.test(message)
    || /column (?:(?:["'][^"']+["']|[a-z0-9_]+) )?(?:of relation ["'][^"']+["'] )?does not exist/.test(message)
    || /(?:could not find (?:the )?(?:table|column) .+ in the )?schema cache/.test(message);
}

/**
 * Logs the raw Postgres/PostgREST error for diagnostics and returns a generic
 * Turkish message safe to show to end users. Never echoes `error.message`
 * (table/column/constraint names) back in the API response.
 */
export function safeDbErrorMessage(error: { message: string; code?: string }, context: string, fallback = "Veri yüklenemedi. Lütfen daha sonra tekrar deneyin."): string {
  console.error(`[${context}] database error`, {
    message: error.message,
    code: error.code,
    schemaCompatibilityError: isSchemaCompatError(error),
  });
  return fallback;
}

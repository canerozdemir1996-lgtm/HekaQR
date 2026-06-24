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

// E-posta -> Supabase user id eşlemesi için kısa ömürlü process-içi önbellek.
// auth.admin.listUsers({perPage:1000}) tüm kullanıcı tablosunu çekip
// deserialize ediyor — bu fallback'e düşen her istekte (eski/senkronize
// olmamış session'lar) tekrar tekrar çağrılması, sil/güncelle gibi mutasyon
// isteklerine gözle görülür gecikme ekliyordu. pm2 tek "fork" instance
// çalıştırdığı için modül seviyesinde Map güvenli.
const EMAIL_LOOKUP_TTL_MS = 5 * 60 * 1000;
const emailLookupCache = new Map<string, { userId: string; expiresAt: number }>();

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const cached = emailLookupCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return cached.userId;

  const { data, error } = await sbAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("[authRequest] Supabase user resolution failed", { code: error.code });
    return null;
  }
  const user = data.users.find(item => item.email?.toLowerCase() === email);
  if (!user) return null;
  emailLookupCache.set(email, { userId: user.id, expiresAt: Date.now() + EMAIL_LOOKUP_TTL_MS });
  return user.id;
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
  const userId = await resolveUserIdByEmail(email);
  return userId ? { userId, role: session?.user?.role } : null;
}

export async function routeParams<T extends Record<string, string>>(context: { params: Promise<T> | T }) {
  return Promise.resolve(context.params);
}

export function isSchemaCompatError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  return ["42703", "42p01", "pgrst204", "pgrst205"].includes(code)
    || /relation ["'][^"']+["'] does not exist/.test(message)
    || /column ["'][^"']+["'] (?:of relation ["'][^"']+["'] )?does not exist/.test(message)
    || /could not find (?:the )?(?:table|column) .+ in the schema cache/.test(message);
}

/**
 * Logs the raw Postgres/PostgREST error for diagnostics and returns a generic
 * Turkish message safe to show to end users. Never echoes `error.message`
 * (table/column/constraint names) back in the API response.
 */
export function safeDbErrorMessage(error: { message: string; code?: string }, context: string, fallback = "Veri yüklenemedi. Lütfen daha sonra tekrar deneyin."): string {
  console.error(`[${context}] database error`, { message: error.message, code: error.code });
  if (isSchemaCompatError(error)) {
    console.error(`[${context}] schema compatibility error`);
  }
  return fallback;
}

// ─── lib/auth.ts ─────────────────────────────────────────────────────────────
// Simple cookie-based auth helpers. Works with Supabase Auth.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "user";
  is_active: boolean;
  created_at: string;
  last_sign_in?: string;
  qr_count?: number;
  scan_count?: number;
}

export type AppRole = AppUser["role"];

export function roleRank(role: AppRole | string | undefined | null) {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

// ─── Admin API helpers ────────────────────────────────────────────────────────

export async function adminListUsers(): Promise<AppUser[]> {
  const sb = getAdminSupabase();
  // Get auth users
  const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);

  // Get profile metadata (stored in user_metadata)
  const result: AppUser[] = users.map(u => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? (u.email?.split("@")[0] ?? ""),
    role: (u.user_metadata?.role as AppRole) ?? "user",
    is_active: !u.banned_until,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));
  return result;
}

export async function adminGetUserStats(userId: string) {
  const sb = getAdminSupabase();
  const { data: qrs } = await sb.from("qr_codes").select("id, scan_count").eq("user_id", userId);
  const qrCount = qrs?.length ?? 0;
  const scanCount = qrs?.reduce((s, q) => s + (q.scan_count ?? 0), 0) ?? 0;
  return { qrCount, scanCount };
}

export async function adminCreateUser(
  email: string, password: string, fullName: string, role: AppRole
) {
  const sb = getAdminSupabase();
  const { data, error } = await sb.auth.admin.createUser({
    email, password,
    user_metadata: { full_name: fullName, role, must_change_password: true },
    email_confirm: false,
  });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function adminUpdateUser(
  userId: string, updates: { full_name?: string; role?: AppRole; is_active?: boolean; password?: string }
) {
  const sb = getAdminSupabase();
  const meta: Record<string, unknown> = {};
  if (updates.full_name !== undefined) meta.full_name = updates.full_name;
  if (updates.role !== undefined) meta.role = updates.role;

  const payload: Record<string, unknown> = { user_metadata: meta };
  if (updates.password) payload.password = updates.password;
  if (updates.is_active === false) payload.ban_duration = "876600h"; // ~100 years
  if (updates.is_active === true) payload.ban_duration = "none";

  const { error } = await sb.auth.admin.updateUserById(userId, payload);
  if (error) throw new Error(error.message);
}

export async function adminDeleteUser(userId: string) {
  const sb = getAdminSupabase();
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function adminGetAllQrCodes() {
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("qr_codes")
    .select("id, title, short_slug, qr_type, is_active, scan_count, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminGetAnalytics() {
  const sb = getAdminSupabase();
  const [{ data: qrs }, { data: scans }] = await Promise.all([
    sb.from("qr_codes").select("id, scan_count, created_at, qr_type, user_id"),
    sb.from("scan_logs").select("scanned_at, device, country, qr_id").order("scanned_at", { ascending: false }).limit(1000),
  ]);
  return { qrs: qrs ?? [], scans: scans ?? [] };
}

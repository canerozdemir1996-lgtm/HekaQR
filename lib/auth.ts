// ─── lib/auth.ts ─────────────────────────────────────────────────────────────
// Simple cookie-based auth helpers. Works with Supabase Auth.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { getUserAvatar } from "@/lib/user-avatar";

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
  avatar_url?: string | null;
}

export type AppRole = AppUser["role"];

const FALLBACK_ROOT_OWNER_EMAILS = [
  "erhanalgl@gmail.com",
  "erhanlalgl@gmail.com",
  "canerozdemir1996@gmail.com",
];

export function rootOwnerEmails() {
  const configured = (process.env.ROOT_OWNER_EMAILS ?? process.env.NEXT_PUBLIC_ROOT_OWNER_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...FALLBACK_ROOT_OWNER_EMAILS, ...configured]);
}

export function isRootOwnerEmail(email?: string | null) {
  return !!email && rootOwnerEmails().has(email.toLowerCase());
}

export function normalizeAppRole(value: unknown): AppRole {
  return value === "owner" || value === "admin" || value === "user" ? value : "user";
}

export function roleFromMetadata(user: { email?: string | null; app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null }) {
  if (isRootOwnerEmail(user.email)) return "owner";
  // user_metadata is editable by the signed-in user via auth.updateUser().
  // Authorization must therefore only trust server-controlled app_metadata.
  return normalizeAppRole(user.app_metadata?.role);
}

export function roleRank(role: AppRole | string | undefined | null) {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

// ─── Admin API helpers ────────────────────────────────────────────────────────

export async function adminListUsers(): Promise<AppUser[]> {
  const sb = getAdminSupabase();
  // Get auth users
  const { data: usersRes, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const users = usersRes?.users ?? [];

  // auth.users.last_sign_in_at sadece Supabase'in KENDİ giriş akışlarında
  // (şifre/Supabase OAuth) güncellenir. Google/GitHub girişi NextAuth
  // üzerinden yürüyor — Supabase'in sign-in metodları hiç çağrılmıyor, bu
  // yüzden bu alan o kullanıcılar için kalıcı olarak null kalıyor ("Hiç giriş
  // yapmadı" gösteriliyor, aktif kullanıcılar için bile). NextAuth'un her
  // girişte güncellediği profiles.last_login_at (bkz. authOptions.ts
  // touchProfileLogin) gerçek kaynak — varsa o öncelikli kullanılır.
  const { data: profiles } = await sb.from("profiles").select("user_id, full_name, avatar_url, last_login_at");
  if (error && users.length === 0) {
    console.error("[adminListUsers] auth listUsers failed, falling back to profiles", {
      message: error.message,
      code: error.code,
    });
    // Fallback: try individual getUserById for each profile to get email + metadata
    const profileList = profiles ?? [];
    const results = await Promise.allSettled(
      profileList.map(async (profile) => {
        const { data: authData } = await sb.auth.admin.getUserById(profile.user_id as string);
        const u = authData?.user;
        return {
          id: profile.user_id as string,
          email: u?.email ?? "",
          full_name: (u?.user_metadata?.full_name as string) ?? (profile.full_name as string | null) ?? "Kullanıcı",
          role: u ? roleFromMetadata(u) : ("user" as AppRole),
          is_active: u ? !u.banned_until : true,
          created_at: u?.created_at ?? "",
          last_sign_in: (profile.last_login_at as string | undefined) ?? u?.last_sign_in_at,
          avatar_url: getUserAvatar(u?.user_metadata ? { user_metadata: u.user_metadata } : null, profile as any),
        } as AppUser;
      })
    );
    return results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean) as AppUser[];
  }
  const lastLoginByUser = new Map((profiles ?? []).map(p => [p.user_id as string, p.last_login_at as string | null]));
  const profileNameByUser = new Map((profiles ?? []).map(p => [p.user_id as string, p.full_name as string | null]));
  const profileAvatarByUser = new Map((profiles ?? []).map(p => [p.user_id as string, p.avatar_url as string | null]));

  // Get profile metadata (stored in user_metadata)
  const result: AppUser[] = users.map(u => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? profileNameByUser.get(u.id) ?? (u.email?.split("@")[0] ?? ""),
    role: roleFromMetadata(u),
    is_active: !u.banned_until,
    created_at: u.created_at,
    last_sign_in: lastLoginByUser.get(u.id) ?? u.last_sign_in_at,
    avatar_url: getUserAvatar(
      { avatar_url: profileAvatarByUser.get(u.id) },
      { user_metadata: u.user_metadata ?? null },
    ),
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
  const finalRole = isRootOwnerEmail(email) ? "owner" : role;
  const { data, error } = await sb.auth.admin.createUser({
    email, password,
    user_metadata: { full_name: fullName, role: finalRole, must_change_password: true },
    app_metadata: { role: finalRole },
    email_confirm: false,
  });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function adminUpdateUser(
  userId: string, updates: { full_name?: string; role?: AppRole; is_active?: boolean; password?: string }
) {
  const sb = getAdminSupabase();
  const { data: current } = await sb.auth.admin.getUserById(userId);
  const meta: Record<string, unknown> = {};
  if (updates.full_name !== undefined) meta.full_name = updates.full_name;

  const payload: Record<string, unknown> = {
    user_metadata: { ...(current?.user?.user_metadata ?? {}), ...meta },
  };
  if (updates.role !== undefined) {
    const finalRole = isRootOwnerEmail(current?.user?.email) ? "owner" : updates.role;
    payload.user_metadata = { ...(payload.user_metadata as Record<string, unknown>), role: finalRole };
    payload.app_metadata = { ...(current?.user?.app_metadata ?? {}), role: finalRole };
  }
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

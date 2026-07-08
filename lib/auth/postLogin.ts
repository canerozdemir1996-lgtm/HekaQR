import { createClient } from "@supabase/supabase-js";
import { isRootOwnerEmail } from "@/lib/auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Runs once right after a successful sign-in (OAuth callback or credentials
// login). Supabase Auth already owns the auth.users row itself now — this
// only keeps our app-specific side tables (root-owner role, profiles,
// audit log) in sync, mirroring what next-auth's signIn callback/events did.
export async function runPostLoginSync(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const sb = adminClient();

  if (isRootOwnerEmail(user.email)) {
    await sb.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), role: "owner" },
      app_metadata: { role: "owner" },
    }).catch(() => {});
  }

  const now = new Date().toISOString();
  await Promise.race([
    sb.from("profiles").upsert({
      user_id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? (user.user_metadata?.picture as string | undefined) ?? null,
      last_login_at: now,
      updated_at: now,
    }, { onConflict: "user_id" }),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).catch(() => {});

  await Promise.resolve(
    sb.from("audit_logs").insert({
      user_id: user.id,
      action: "signin",
      resource: "auth",
      status: "success",
    })
  ).catch(() => {});
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runPostLoginSync } from "@/lib/auth/postLogin";

export const dynamic = "force-dynamic";

// Called client-side right after a successful credentials (email/password)
// sign-in — the OAuth path runs the same sync inline in app/auth/callback.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await runPostLoginSync(user);
  return NextResponse.json({ ok: true });
}

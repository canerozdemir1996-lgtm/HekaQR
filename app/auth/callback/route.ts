import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runPostLoginSync } from "@/lib/auth/postLogin";

// Supabase OAuth (Google/GitHub) redirect target after the provider sends the
// user back to Supabase's own /auth/v1/callback. Supabase then forwards here
// with a `code` param to exchange for a session. Replaces next-auth's
// /api/auth/callback/google.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=true`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=true`);
  }

  await runPostLoginSync(data.user);

  // Reject protocol-relative ("//evil.com") and scheme-bearing paths, not
  // just non-"/"-prefixed ones, to avoid an open redirect off this domain.
  const safeNext = /^\/(?!\/)/.test(next) ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}

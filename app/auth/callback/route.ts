import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runPostLoginSync } from "@/lib/auth/postLogin";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

// Supabase OAuth (Google/GitHub) redirect target after the provider sends the
// user back to Supabase's own /auth/v1/callback. Supabase then forwards here
// with a `code` param to exchange for a session. Replaces next-auth's
// /api/auth/callback/google.
export async function GET(req: NextRequest) {
  const { searchParams, origin: rawOrigin } = new URL(req.url);
  // Hostinger's reverse proxy can forward requests with an internal Host
  // (e.g. 0.0.0.0:3000) instead of the public domain, so req.url's origin
  // isn't trustworthy — fall back to the known public origin instead.
  const origin = getPublicAppOrigin(rawOrigin);
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

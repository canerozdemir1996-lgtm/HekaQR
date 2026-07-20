import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runPostLoginSync } from "@/lib/auth/postLogin";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { safeInternalPath } from "@/lib/auth-redirect";

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
  const next = safeInternalPath(searchParams.get("next"));

  const loginErrorUrl = new URL("/login", origin);
  loginErrorUrl.searchParams.set("error", "oauth");
  loginErrorUrl.searchParams.set("next", next);

  if (!code) {
    return NextResponse.redirect(loginErrorUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(loginErrorUrl);
  }

  await runPostLoginSync(data.user);

  return NextResponse.redirect(new URL(next, origin));
}

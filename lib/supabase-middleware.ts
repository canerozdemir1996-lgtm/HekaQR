import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request and returns the
// current user (or null). Mirrors next-auth/middleware's withAuth token check.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove: this revalidates the token against Supabase Auth and
  // refreshes it if needed. Do not run code between createServerClient and
  // this call, and do not swap it for getSession() (that only reads the
  // local cookie without validating it).
  const { data: { user } } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}

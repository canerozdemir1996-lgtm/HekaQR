import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Route Handler / Server Component client — reads the user's session from
// request cookies (set by the browser client via @supabase/ssr). Use this
// wherever the previous code called getServerSession(authOptions).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render (not a Route Handler /
            // Server Action) — cookies() is read-only there. Middleware
            // refreshes the session cookie on every request, so this is safe.
          }
        },
      },
    }
  );
}

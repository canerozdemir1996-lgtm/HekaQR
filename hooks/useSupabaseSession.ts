"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, hasSupabaseBrowserEnv } from "@/lib/supabase";
import { roleFromMetadata, type AppRole } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: AppRole;
};

export type Session = { user: SessionUser } | null;
export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
    image: (user.user_metadata?.avatar_url as string | undefined) ?? (user.user_metadata?.picture as string | undefined) ?? null,
    role: roleFromMetadata(user),
  };
}

// Drop-in replacement for next-auth/react's useSession(). Reads the
// Supabase browser session (cookie-backed, see lib/supabase.ts) and stays in
// sync via onAuthStateChange — same { data: session, status } shape so call
// sites didn't need to change beyond the import.
export function useSession(): { data: Session; status: SessionStatus } {
  const [state, setState] = useState<{ data: Session; status: SessionStatus }>(() => (
    hasSupabaseBrowserEnv()
      ? { data: null, status: "loading" }
      : { data: null, status: "unauthenticated" }
  ));

  useEffect(() => {
    let mounted = true;
    if (!hasSupabaseBrowserEnv()) {
      return () => {
        mounted = false;
      };
    }
    const sb = getSupabase();

    sb.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState(
        session?.user
          ? { data: { user: toSessionUser(session.user) }, status: "authenticated" }
          : { data: null, status: "unauthenticated" }
      );
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(
        session?.user
          ? { data: { user: toSessionUser(session.user) }, status: "authenticated" }
          : { data: null, status: "unauthenticated" }
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

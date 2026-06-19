"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const POLL_MS = 30000;

/** Unread admin_messages count for the current session user, used by the dashboard bell badge. */
export function useUnreadMessageCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.id) { setCount(0); return; }
      const { count: unread } = await sb
        .from("admin_messages")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .is("read_at", null)
        .is("deleted_by_user_at", null);
      setCount(unread ?? 0);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-driven update
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return count;
}

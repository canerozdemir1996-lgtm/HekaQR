"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 90000;

/** Unread admin_messages count for the current session user, used by the dashboard bell badge. */
export function useUnreadMessageCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/messages?countOnly=1");
      if (!res.ok) { setCount(0); return; }
      const json = await res.json();
      setCount(json.count ?? 0);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-driven update
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onRealtime = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("qrpublish:messages-changed", onRealtime);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("qrpublish:messages-changed", onRealtime);
    };
  }, [refresh]);

  return count;
}

"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast";
import { useToast } from "@/components/toast";
import { BigAlertProvider, useBigAlert } from "@/components/bigAlert";
import { getSupabase } from "@/lib/supabase";
import { getStoredTheme, setStoredTheme } from "@/lib/theme";

function hasSupabaseClientEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function ThemeHydrator() {
  useEffect(() => {
    const apply = () => setStoredTheme(getStoredTheme());
    apply();

    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, []);

  return null;
}

function UserHeartbeat() {
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseClientEnv()) return;

    let alive = true;
    const sb = getSupabase();

    async function upsertNow(uid: string) {
      try {
        await sb
          .from("user_presence")
          .upsert({ user_id: uid, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
      } catch {
        // ignore
      }
    }

    async function start() {
      const { data: { user } } = await sb.auth.getUser();
      if (!alive || !user?.id) return;
      userIdRef.current = user.id;

      // immediate ping
      await upsertNow(user.id);

      if (!hbRef.current) {
        hbRef.current = setInterval(() => {
          const uid = userIdRef.current;
          if (!uid) return;
          // reduce noise when tab is hidden
          if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
          upsertNow(uid).catch(() => {});
        }, 20000);
      }
    }

    start().catch(() => {});

    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session?.user?.id) {
        userIdRef.current = null;
        if (hbRef.current) {
          clearInterval(hbRef.current);
          hbRef.current = null;
        }
        return;
      }
      userIdRef.current = session.user.id;
      upsertNow(session.user.id).catch(() => {});
      if (!hbRef.current) {
        hbRef.current = setInterval(() => {
          const uid = userIdRef.current;
          if (!uid) return;
          if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
          upsertNow(uid).catch(() => {});
        }, 20000);
      }
    });

    const onVis = () => {
      const uid = userIdRef.current;
      if (!uid) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        upsertNow(uid).catch(() => {});
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      alive = false;
      try { authSub.subscription.unsubscribe(); } catch { /* ignore */ }
      userIdRef.current = null;
      if (hbRef.current) {
        clearInterval(hbRef.current);
        hbRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, []);

  return null;
}

function RealtimeOwnerMessages() {
  const toast = useToast();
  const big = useBigAlert();
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const drainUnread = useCallback(async (sb: ReturnType<typeof getSupabase>, userId: string) => {
    // Fallback for cases where Realtime is disabled/misconfigured:
    // show any unread messages that already exist.
    try {
      const { data, error } = await sb
        .from("admin_messages")
        .select("id, title, body, created_at, popup_kind, deleted_by_user_at")
        .eq("to_user_id", userId)
        .is("deleted_by_user_at", null)
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) return;
      const rows = (data ?? []) as Array<{ id: string; title: string | null; body: string | null; popup_kind?: string | null; created_at: string; read_at?: string | null }>;

      // Show messages from last 24 hours regardless of read status (important messages)
      // Plus any unread messages older than 24 hours
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      for (const msg of rows) {
        const msgTime = new Date(msg.created_at).getTime();
        const isRecent = msgTime > oneDayAgo;
        const shouldShow = isRecent || !msg.read_at; // Show recent OR unread messages

        if (shouldShow) {
          const title = msg.title ?? "System Owner";
          const body = msg.body ?? "";
          const kind = (msg.popup_kind ?? "small") as string;
          if (body) {
            if (kind === "big") big.warn(body, title);
            else toast.info(body, title);
          }
        }

        // Mark as read only if it's not recent (recent messages can be shown multiple times)
        if (msg.id && !isRecent) {
          await sb
            .from("admin_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", msg.id)
            .eq("to_user_id", userId);
        }
      }
    } catch {
      // ignore
    }
  }, [toast, big]);

  useEffect(() => {
    if (!hasSupabaseClientEnv()) return;

    let alive = true;
    const sb = getSupabase();

    async function start() {
      const { data: { user } } = await sb.auth.getUser();
      if (!alive || !user?.id) return;

      userIdRef.current = user.id;

      // Drain unread messages on load (fallback to ensure user sees popups)
      await drainUnread(sb, user.id);

      // Poll unread as a safety net when Realtime misses events
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          const uid = userIdRef.current;
          if (!uid) return;
          drainUnread(sb, uid).catch(() => {});
        }, 15000);
      }

      // Cleanup existing channel (if any)
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }

      const ch = sb
        .channel(`admin_messages:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_messages",
            filter: `to_user_id=eq.${user.id}`,
          },
          async (payload) => {
            const msg = payload.new as any;
            const title = (msg?.title as string | null) ?? "System Owner";
            const body = (msg?.body as string | null) ?? "";
            const kind = (msg?.popup_kind as string | null) ?? "small";
            if (body) {
              if (kind === "big") big.warn(body, title);
              else toast.info(body, title);
            }

            // Mark as read only after showing, but allow recent messages to be shown again
            const msgTime = new Date(msg?.created_at).getTime();
            const isRecent = msgTime > (Date.now() - 24 * 60 * 60 * 1000);

            if (msg?.id && !isRecent) {
              try {
                await sb
                  .from("admin_messages")
                  .update({ read_at: new Date().toISOString() })
                  .eq("id", msg.id)
                  .eq("to_user_id", user.id);
              } catch { /* ignore */ }
            }
          }
        )
        .subscribe();

      channelRef.current = ch;
    }

    start().catch(() => {});

    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session?.user?.id) {
        userIdRef.current = null;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (channelRef.current) {
          try { sb.removeChannel(channelRef.current); } catch { /* ignore */ }
          channelRef.current = null;
        }
        return;
      }
      start().catch(() => {});
    });

    return () => {
      alive = false;
      try { authSub.subscription.unsubscribe(); } catch { /* ignore */ }
      userIdRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }
    };
  }, [toast, big, drainUnread]);

  return null;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <BigAlertProvider>
          <ThemeHydrator />
          <UserHeartbeat />
          <RealtimeOwnerMessages />
          {children}
        </BigAlertProvider>
      </ToastProvider>
    </SessionProvider>
  );
}


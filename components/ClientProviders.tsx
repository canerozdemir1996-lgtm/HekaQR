"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { ToastProvider } from "@/components/toast";
import { useToast } from "@/components/toast";
import { getSupabase } from "@/lib/supabase";

function RealtimeOwnerMessages() {
  const toast = useToast();
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  const drainUnread = useCallback(async (sb: ReturnType<typeof getSupabase>, userId: string) => {
    // Fallback for cases where Realtime is disabled/misconfigured:
    // show any unread messages that already exist.
    try {
      const { data, error } = await sb
        .from("admin_messages")
        .select("id, title, body, created_at")
        .eq("to_user_id", userId)
        .is("read_at", null)
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) return;
      const rows = (data ?? []) as Array<{ id: string; title: string | null; body: string | null }>;
      for (const msg of rows) {
        const title = msg.title ?? "System Owner";
        const body = msg.body ?? "";
        if (body) toast.info(body, title);
        if (msg.id) {
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
  }, [toast, drainUnread]);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();

    async function start() {
      const { data: { user } } = await sb.auth.getUser();
      if (!alive || !user?.id) return;

      // Drain unread messages on load (fallback to ensure user sees popups)
      await drainUnread(sb, user.id);

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
            if (body) toast.info(body, title);

            // Mark as read (best-effort)
            try {
              if (msg?.id) {
                await sb
                  .from("admin_messages")
                  .update({ read_at: new Date().toISOString() })
                  .eq("id", msg.id)
                  .eq("to_user_id", user.id);
              }
            } catch { /* ignore */ }
          }
        )
        .subscribe();

      channelRef.current = ch;
    }

    start().catch(() => {});

    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session?.user?.id) {
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
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }
    };
  }, [toast]);

  return null;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RealtimeOwnerMessages />
      {children}
    </ToastProvider>
  );
}


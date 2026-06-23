"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { ToastProvider } from "@/components/toast";
import { useToast } from "@/components/toast";
import { BigAlertProvider, useBigAlert } from "@/components/bigAlert";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import PwaBootstrap from "@/components/PwaBootstrap";
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

// Bu uygulamada giriş NextAuth ile yapılıyor — tarayıcıdaki Supabase istemcisi
// hiçbir zaman kendi auth oturumunu kurmuyor. Bu yüzden admin_messages
// teslimatı Supabase Realtime/RLS (auth.uid()) üzerinden DEĞİL, NextAuth
// oturumunu doğrulayan /api/v1/messages rotası + polling ile yapılır.
function OwnerMessagesPoller() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const big = useBigAlert();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bir mesaj bu sekmede bir kez gösterildiyse tekrar gösterilmesin — read_at
  // sunucuya PATCH ile yazılana kadarki kısa pencerede (bir sonraki 15s poll)
  // aynı mesajın ikinci kez popup olarak çıkmasını önler.
  const shownIdsRef = useRef<Set<string>>(new Set());

  const drainUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/messages");
      if (!res.ok) return;
      const json = await res.json();
      const rows = (json.messages ?? []) as Array<{ id: string; title: string | null; body: string | null; popup_kind?: string | null; read_at?: string | null }>;

      for (const msg of rows) {
        if (!msg.id || msg.read_at || shownIdsRef.current.has(msg.id)) continue;
        shownIdsRef.current.add(msg.id);

        const title = msg.title ?? "System Owner";
        const body = msg.body ?? "";
        const kind = (msg.popup_kind ?? "small") as string;
        if (body) {
          if (kind === "big") big.warn(body, title, { html: true });
          else toast.info(body, title, { html: true });
        }

        await fetch(`/api/v1/messages?id=${encodeURIComponent(msg.id)}&action=read`, { method: "PATCH" }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [toast, big]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    void drainUnread();
    pollRef.current = setInterval(() => void drainUnread(), 15000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [status, session?.user?.id, drainUnread]);

  return null;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <BigAlertProvider>
          <ThemeHydrator />
          <PwaBootstrap />
          <UserHeartbeat />
          <OwnerMessagesPoller />
          {children}
          <CookieConsentBanner />
        </BigAlertProvider>
      </ToastProvider>
    </SessionProvider>
  );
}


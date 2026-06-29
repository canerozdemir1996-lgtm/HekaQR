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

// Auth NextAuth üzerinden yapıldığından sb.auth.getUser() tarayıcıda her zaman
// null döner. NextAuth session'dan user id alıp doğrudan upsert yapıyoruz.
function UserHeartbeat() {
  const { data: session, status } = useSession();
  const uid = status === "authenticated" ? (session?.user?.id ?? null) : null;
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!uid || !hasSupabaseClientEnv()) return;

    const sb = getSupabase();
    const upsertNow = () => {
      if (document.visibilityState === "hidden") return;
      void (sb.from("user_presence")
        .upsert({ user_id: uid, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" }) as unknown as Promise<unknown>)
        .catch(() => {});
    };

    upsertNow();
    hbRef.current = setInterval(upsertNow, 120000);
    document.addEventListener("visibilitychange", upsertNow);

    return () => {
      clearInterval(hbRef.current ?? undefined);
      hbRef.current = null;
      document.removeEventListener("visibilitychange", upsertNow);
    };
  }, [uid]);

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
      const res = await fetch("/api/v1/messages?unreadOnly=1");
      if (!res.ok) return;
      const json = await res.json();
      const rows = (json.messages ?? []) as Array<{ id: string; title: string | null; body: string | null; popup_kind?: string | null; read_at?: string | null }>;

      for (const msg of rows) {
        if (!msg.id || shownIdsRef.current.has(msg.id)) continue;
        shownIdsRef.current.add(msg.id);

        const title = msg.title ?? "System Owner";
        const body = msg.body ?? "";
        const kind = (msg.popup_kind ?? "small") as string;
        if (body) {
          if (kind === "big") big.warn(body, title, { html: true });
          else toast.info(body, title, { html: true });
        }

      }
    } catch {
      // ignore
    }
  }, [toast, big]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    void drainUnread();
    pollRef.current = setInterval(() => void drainUnread(), 120000);
    const onRealtime = () => void drainUnread();
    window.addEventListener("qrpublish:messages-changed", onRealtime);

    return () => {
      window.removeEventListener("qrpublish:messages-changed", onRealtime);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [status, session?.user?.id, drainUnread]);

  return null;
}

function DashboardRealtimeBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const source = new EventSource("/api/v1/realtime", { withCredentials: true });
    const seen = new Set<string>();
    const onChange = (event: MessageEvent<string>) => {
      if (event.lastEventId && seen.has(event.lastEventId)) return;
      if (event.lastEventId) {
        seen.add(event.lastEventId);
        if (seen.size > 200) seen.delete(seen.values().next().value as string);
      }
      let detail: { entity?: string; eventType?: string; id?: string } = {};
      try { detail = JSON.parse(event.data || "{}"); } catch { return; }
      window.dispatchEvent(new CustomEvent("qrpublish:dashboard-change", { detail }));
      if (detail.entity === "message") window.dispatchEvent(new Event("qrpublish:messages-changed"));
    };

    source.addEventListener("dashboard-change", onChange as EventListener);
    return () => {
      source.removeEventListener("dashboard-change", onChange as EventListener);
      source.close();
    };
  }, [session?.user?.id, status]);

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
          <DashboardRealtimeBridge />
          <OwnerMessagesPoller />
          {children}
          <CookieConsentBanner />
        </BigAlertProvider>
      </ToastProvider>
    </SessionProvider>
  );
}


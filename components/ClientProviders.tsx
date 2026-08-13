"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useSession } from "@/hooks/useSupabaseSession";
import { ToastProvider } from "@/components/toast";
import { useToast } from "@/components/toast";
import { BigAlertProvider, useBigAlert } from "@/components/bigAlert";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ConsentAwareAnalytics from "@/components/ConsentAwareAnalytics";
import PwaBootstrap from "@/components/PwaBootstrap";
import { getSupabase } from "@/lib/supabase";
import { getStoredTheme, setStoredTheme } from "@/lib/theme";
import { usePathname } from "next/navigation";

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

const SHOWN_MESSAGE_TOASTS_KEY = "qrpublish:shown-message-toasts";

function loadShownMessageToasts() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(SHOWN_MESSAGE_TOASTS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function rememberShownMessageToast(id: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    ids.add(id);
    window.localStorage.setItem(SHOWN_MESSAGE_TOASTS_KEY, JSON.stringify(Array.from(ids).slice(-300)));
  } catch {
    // ignore storage failures
  }
}

function markMessageRead(id: string) {
  void fetch(`/api/v1/messages?id=${encodeURIComponent(id)}&action=read`, {
    method: "PATCH",
    keepalive: true,
  }).catch(() => {});
}

function UserHeartbeat() {
  const { data: session, status } = useSession();
  const uid = status === "authenticated" ? (session?.user?.id ?? null) : null;
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!uid || !hasSupabaseClientEnv()) return;

    const sb = getSupabase();
    const upsertNow = () => {
      if (document.visibilityState === "hidden") return;
      // PostgrestBuilder thenable değil Promise — Promise.resolve() ile sararak .catch() kullanıyoruz
      void Promise.resolve(
        sb.from("user_presence")
          .upsert({ user_id: uid, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" })
      ).catch(() => {});
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

// admin_messages teslimatı Supabase Realtime/RLS yerine /api/v1/messages
// rotası + polling ile yapılır (bkz. dashboard mesajlaşma akışı).
function OwnerMessagesPoller() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const big = useBigAlert();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bir mesaj bu sekmede bir kez gösterildiyse tekrar gösterilmesin — read_at
  // sunucuya PATCH ile yazılana kadarki kısa pencerede (bir sonraki 15s poll)
  // aynı mesajın ikinci kez popup olarak çıkmasını önler.
  const shownIdsRef = useRef<Set<string>>(new Set());
  const shownLoadedRef = useRef(false);

  const drainUnread = useCallback(async () => {
    try {
      if (!shownLoadedRef.current) {
        shownIdsRef.current = loadShownMessageToasts();
        shownLoadedRef.current = true;
      }

      const res = await fetch("/api/v1/messages?unreadOnly=1");
      if (!res.ok) return;
      const json = await res.json();
      const rows = (json.messages ?? []) as Array<{ id: string; title: string | null; body: string | null; popup_kind?: string | null; read_at?: string | null }>;

      for (const msg of rows) {
        if (!msg.id || shownIdsRef.current.has(msg.id)) continue;
        rememberShownMessageToast(msg.id, shownIdsRef.current);

        const title = msg.title ?? "System Owner";
        const body = msg.body ?? "";
        const kind = (msg.popup_kind ?? "small") as string;
        if (body) {
          if (kind === "big") big.warn(body, title, { html: true });
          else toast.info(body, title, { html: true });
        }

        markMessageRead(msg.id);
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
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !pathname?.startsWith("/dashboard")) return;

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
  }, [pathname, session?.user?.id, status]);

  return null;
}

export default function ClientProviders({ children, gtmId }: { children: React.ReactNode; gtmId: string }) {
  return (
    <ToastProvider>
      <BigAlertProvider>
        <ThemeHydrator />
        <ConsentAwareAnalytics gtmId={gtmId} />
        <PwaBootstrap />
        <UserHeartbeat />
        <DashboardRealtimeBridge />
        <OwnerMessagesPoller />
        <a href="#main-content" className="fixed left-4 top-4 z-[200] -translate-y-24 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white shadow-xl transition-transform focus:translate-y-0">
          İçeriğe geç
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <CookieConsentBanner />
      </BigAlertProvider>
    </ToastProvider>
  );
}


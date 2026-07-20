"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieChoice,
  type CookieChoice,
} from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function updateConsent(choice: CookieChoice | null) {
  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  gtag("consent", choice === "accepted" ? "update" : "default", {
    analytics_storage: choice === "accepted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

function loadGoogleTagManager(gtmId: string) {
  if (document.querySelector<HTMLScriptElement>("script[data-qrpublish-gtm]")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.dataset.qrpublishGtm = "true";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

export default function ConsentAwareAnalytics({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    const applyChoice = (choice: CookieChoice | null) => {
      updateConsent(choice);
      if (choice === "accepted") loadGoogleTagManager(gtmId);
    };

    applyChoice(parseCookieChoice(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)));
    const onConsent = (event: Event) => {
      applyChoice((event as CustomEvent<CookieChoice>).detail);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, [gtmId]);

  return null;
}

export const COOKIE_CONSENT_STORAGE_KEY = "qrpublish_cookie_pref_v1";
export const COOKIE_CONSENT_EVENT = "qrpublish:cookie-consent";

export type CookieChoice = "accepted" | "necessary";

export function parseCookieChoice(value: string | null): CookieChoice | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { choice?: unknown };
    return parsed.choice === "accepted" || parsed.choice === "necessary" ? parsed.choice : null;
  } catch {
    return null;
  }
}

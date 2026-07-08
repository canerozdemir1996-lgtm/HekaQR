// Supabase Auth's session JWT can't carry a custom "2FA challenge completed
// this session" claim without a Custom Access Token Hook (dashboard-only
// config). Instead we bind that flag to an httpOnly cookie, scoped to the
// signed-in user via a hash of their id so a stale cookie can't grant another
// account's MFA-completed state on a shared browser.
//
// Uses the Web Crypto API (globalThis.crypto.subtle) instead of Node's
// `crypto` module: this is imported by middleware.ts, which runs on the Edge
// runtime and doesn't support Node built-ins. Web Crypto works in both Edge
// and Node.js route handlers, so the hash matches everywhere.
export const MFA_COOKIE_NAME = "mfa_verified";
const MFA_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 gün, Supabase session ömrüyle aynı

export async function mfaCookieValueFor(userId: string): Promise<string> {
  const data = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isMfaCookieValid(cookieValue: string | undefined, userId: string): Promise<boolean> {
  return !!cookieValue && cookieValue === (await mfaCookieValueFor(userId));
}

export const mfaCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MFA_COOKIE_MAX_AGE,
};

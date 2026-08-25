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
export const MFA_COOKIE_NAME = "__Host-qr_mfa_verified";
const MFA_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 gün, Supabase session ömrüyle aynı

function cookieSecret() {
  const value = process.env.MFA_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("MFA_COOKIE_SECRET is required.");
  return value;
}

export async function mfaCookieValueFor(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cookieSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`mfa:${userId}`));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isMfaCookieValid(cookieValue: string | undefined, userId: string): Promise<boolean> {
  if (!cookieValue) return false;
  let expected: string;
  try {
    expected = await mfaCookieValueFor(userId);
  } catch {
    return false;
  }
  if (cookieValue.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= cookieValue.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export const mfaCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MFA_COOKIE_MAX_AGE,
};

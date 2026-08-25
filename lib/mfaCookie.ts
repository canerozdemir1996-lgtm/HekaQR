export const MFA_COOKIE_NAME = "__Host-qr_mfa_verified";
const MFA_COOKIE_VERSION = 1;
const MFA_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;

type MfaCookieClaims = {
  v: number;
  uid: string;
  sid: string;
  iat: number;
  exp: number;
};

function cookieSecret() {
  const dedicated = process.env.MFA_COOKIE_SECRET?.trim();
  if (dedicated) {
    if (process.env.NODE_ENV === "production" && dedicated.length < 32) {
      throw new Error("MFA_COOKIE_SECRET must contain at least 32 characters in production.");
    }
    if (process.env.NODE_ENV === "production" && dedicated === process.env.QR_UNLOCK_SECRET?.trim()) {
      throw new Error("MFA_COOKIE_SECRET and QR_UNLOCK_SECRET must be different.");
    }
    return dedicated;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MFA_COOKIE_SECRET is required in production.");
  }
  const developmentFallback = process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!developmentFallback) throw new Error("MFA_COOKIE_SECRET is required.");
  return developmentFallback;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

async function signatureFor(payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cookieSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export function mfaSessionIdFromAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) return "";
  try {
    const payload = JSON.parse(base64UrlDecode(accessToken.split(".")[1] ?? "")) as { session_id?: unknown };
    return typeof payload.session_id === "string" && payload.session_id.length <= 256 ? payload.session_id : "";
  } catch {
    return "";
  }
}

export async function mfaCookieValueFor(userId: string, sessionId: string, nowMs = Date.now()): Promise<string> {
  if (!userId || !sessionId) throw new Error("A verified user and session are required for MFA.");
  const issuedAt = Math.floor(nowMs / 1000);
  const claims: MfaCookieClaims = {
    v: MFA_COOKIE_VERSION,
    uid: userId,
    sid: sessionId,
    iat: issuedAt,
    exp: issuedAt + MFA_COOKIE_MAX_AGE,
  };
  const payload = base64UrlEncode(JSON.stringify(claims));
  return `${payload}.${await signatureFor(payload)}`;
}

export async function isMfaCookieValid(
  cookieValue: string | undefined,
  userId: string,
  sessionId: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!cookieValue || !userId || !sessionId) return false;
  const separator = cookieValue.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = cookieValue.slice(0, separator);
  const suppliedSignature = cookieValue.slice(separator + 1);

  let expectedSignature: string;
  let claims: MfaCookieClaims;
  try {
    expectedSignature = await signatureFor(payload);
    claims = JSON.parse(base64UrlDecode(payload)) as MfaCookieClaims;
  } catch {
    return false;
  }
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return false;

  const now = Math.floor(nowMs / 1000);
  return claims.v === MFA_COOKIE_VERSION
    && claims.uid === userId
    && claims.sid === sessionId
    && Number.isInteger(claims.iat)
    && Number.isInteger(claims.exp)
    && claims.iat <= now + MAX_CLOCK_SKEW_SECONDS
    && claims.exp > now
    && claims.exp > claims.iat
    && claims.exp - claims.iat <= MFA_COOKIE_MAX_AGE;
}

export const mfaCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MFA_COOKIE_MAX_AGE,
};

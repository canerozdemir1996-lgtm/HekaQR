import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_TEST_RUNNER_SECRET || "";
}

function signature(timestamp: string, key: string) {
  return createHmac("sha256", key).update(`admin-tests:${timestamp}`).digest("hex");
}

export function createAdminTestToken(now = Date.now()) {
  const key = secret();
  if (!key) return "";
  const timestamp = String(now);
  return `${timestamp}.${signature(timestamp, key)}`;
}

export function verifyAdminTestToken(token: string | null, now = Date.now()) {
  const key = secret();
  if (!key) return false;
  if (!token) return false;
  const [timestamp, provided] = token.split(".");
  const issuedAt = Number(timestamp);
  if (!timestamp || !provided || !Number.isFinite(issuedAt) || issuedAt > now + 30_000 || now - issuedAt > TOKEN_LIFETIME_MS) return false;
  const expected = signature(timestamp, key);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

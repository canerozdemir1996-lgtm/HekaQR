import crypto from "crypto";

const COOKIE_PREFIX = "qr_unlock_";
const TTL_MS = 30 * 60 * 1000; // 30 dakika — bu süre sonunda şifre tekrar sorulur
const EPHEMERAL_DEVELOPMENT_SECRET = crypto.randomBytes(32).toString("hex");

function secret() {
  const configured = process.env.QR_UNLOCK_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("QR_UNLOCK_SECRET is required in production.");
  }
  return EPHEMERAL_DEVELOPMENT_SECRET;
}

function sign(slug: string, password: string, expiresAt: number) {
  return crypto.createHmac("sha256", secret()).update(`${slug}:${password}:${expiresAt}`).digest("hex");
}

/**
 * Şifre korumalı bir QR'ın çözüm cookie'sinin adı — slug'ın hash'i kullanılır
 * ki slug'daki karakterler cookie adı için her zaman güvenli olsun ve birden
 * fazla farklı şifreli QR aynı anda "unlocked" kalabilsin.
 */
export function unlockCookieName(slug: string): string {
  const hash = crypto.createHash("sha256").update(slug.toLowerCase()).digest("hex").slice(0, 16);
  return `${COOKIE_PREFIX}${hash}`;
}

/**
 * Doğru şifre girildiğinde set edilecek cookie'nin adı/değeri/ömrünü üretir.
 * Değer imzalı (HMAC) olduğu için cookie'yi taklit edip başka bir QR'ı
 * şifresiz açmak mümkün değildir — imza hem slug hem de gerçek şifreye bağlıdır.
 */
export function buildUnlockCookie(slug: string, password: string): { name: string; value: string; maxAgeSeconds: number } {
  const normalizedSlug = slug.toLowerCase();
  const expiresAt = Date.now() + TTL_MS;
  const signature = sign(normalizedSlug, password, expiresAt);
  return {
    name: unlockCookieName(normalizedSlug),
    value: `${expiresAt}.${signature}`,
    maxAgeSeconds: Math.floor(TTL_MS / 1000),
  };
}

export function isUnlockCookieValid(slug: string, password: string, cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) return false;

  const expiresAt = Number(cookieValue.slice(0, dotIndex));
  const signature = cookieValue.slice(dotIndex + 1);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = sign(slug.toLowerCase(), password, expiresAt);
  const signatureBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (signatureBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(signatureBuf, expectedBuf);
}

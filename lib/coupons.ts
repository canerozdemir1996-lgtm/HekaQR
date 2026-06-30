import crypto from "crypto";

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 64);
}

export function hashCouponRedeemer(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateCouponCode(prefix = "QR") {
  const cleanPrefix = normalizeCouponCode(prefix).replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "QR";
  const token = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${cleanPrefix}-${token}`;
}

export function couponValidUntilToIso(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999Z`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

import crypto from "crypto";
import {
  calculateEnterprisePricing,
  getEnterprisePricingConfig,
  type EnterpriseBillingPreference,
  type EnterpriseConfiguration,
} from "@/lib/pricing/enterprise-pricing";

export type EnterpriseQuoteStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "checkout_created"
  | "converted"
  | "rejected"
  | "expired";

export type EnterpriseRateLimitConfig = {
  ipWindowMinutes: number;
  ipMaxRequests: number;
  emailWindowMinutes: number;
  emailMaxRequests: number;
};

export class EnterpriseRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnterpriseRateLimitError";
  }
}

export const enterpriseRateLimitConfig: EnterpriseRateLimitConfig = {
  ipWindowMinutes: 10,
  ipMaxRequests: 5,
  emailWindowMinutes: 60,
  emailMaxRequests: 3,
};

export function buildEnterpriseQuoteNumber(sequenceValue: number, date = new Date()) {
  const year = date.getUTCFullYear();
  return `Q-${year}-${String(sequenceValue).padStart(6, "0")}`;
}

export function createEnterpriseQuotePublicId() {
  return `quote_${crypto.randomBytes(12).toString("hex")}`;
}

export function hashEnterpriseValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getEnterpriseClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  const cf = headers.get("cf-connecting-ip")?.trim();
  return forwarded || real || cf || null;
}

export function shouldRateLimit(count: number, limit: number) {
  return count >= limit;
}

export function assertEnterpriseRateLimits(input: {
  ipCount: number;
  emailCount: number;
  config?: EnterpriseRateLimitConfig;
}) {
  const config = input.config ?? enterpriseRateLimitConfig;
  if (shouldRateLimit(input.ipCount, config.ipMaxRequests)) {
    throw new EnterpriseRateLimitError("Çok fazla teklif isteği gönderildi. Lütfen biraz sonra tekrar deneyin.");
  }
  if (shouldRateLimit(input.emailCount, config.emailMaxRequests)) {
    throw new EnterpriseRateLimitError("Bu e-posta adresi için şu an yeni teklif oluşturulamıyor. Lütfen daha sonra tekrar deneyin.");
  }
}

export function getEnterpriseSelectedPriceCents(
  billingPreference: EnterpriseBillingPreference,
  configuration: EnterpriseConfiguration,
) {
  const pricing = calculateEnterprisePricing(configuration);
  return billingPreference === "monthly" ? pricing.monthlyCents : pricing.annualCents;
}

export function resolveEnterpriseVariantId(
  billingPreference: EnterpriseBillingPreference,
  env: NodeJS.ProcessEnv = process.env,
) {
  const envKey =
    billingPreference === "monthly"
      ? "LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID"
      : "LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID";

  const value = env[envKey]?.trim();
  if (!value) {
    throw new Error(`Missing enterprise billing variant configuration: ${envKey}`);
  }
  return value;
}

export function isEnterpriseSelfServeCheckoutEnabled(env: NodeJS.ProcessEnv = process.env) {
  const value = env.ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function buildEnterpriseQuoteSummary(configuration: EnterpriseConfiguration) {
  const pricing = calculateEnterprisePricing(configuration);
  const config = getEnterprisePricingConfig();

  return {
    configuration,
    pricing,
    currency: config.currency,
  };
}

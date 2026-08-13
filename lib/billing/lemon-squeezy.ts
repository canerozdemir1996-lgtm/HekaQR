import crypto from "crypto";
import type { CheckoutPlanKey } from "@/lib/billing/plans";
import { resolveVariantId } from "@/lib/billing/plans";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

export type CheckoutLocale = "tr" | "en";

// Lemon Squeezy "checkout_data.name must be a string" hatasını engeller — bazı
// kullanıcı kayıtlarında user_metadata.full_name/name bozuk (string olmayan)
// bir değer taşıyabiliyor; tip cast'leri (`as string`) bunu derleme zamanında
// yakalamıyor, burada çalışma zamanında doğrulanıyor.
function safeCheckoutName(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 255) : undefined;
}

type LemonApiResponse<T> = {
  data?: T;
  errors?: Array<{ detail?: string; title?: string; status?: string }>;
};

type LemonCheckoutData = {
  id: string;
  attributes?: {
    url?: string;
  };
};

type LemonSubscriptionData = {
  id: string;
  attributes?: LemonSubscriptionAttributes;
};

type LemonCustomerData = {
  id: string;
  attributes?: {
    urls?: {
      customer_portal?: string | null;
    } | null;
  };
};

export type LemonSubscriptionAttributes = {
  customer_id?: number | string | null;
  order_id?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  user_name?: string | null;
  user_email?: string | null;
  status?: string | null;
  cancelled?: boolean | null;
  trial_ends_at?: string | null;
  billing_anchor?: number | null;
  renews_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  test_mode?: boolean | null;
  card_brand?: string | null;
  card_last_four?: string | null;
  payment_processor?: string | null;
  pause?: Record<string, unknown> | null;
  urls?: {
    update_payment_method?: string | null;
    customer_portal?: string | null;
    customer_portal_update_subscription?: string | null;
  } | null;
};

export class LemonConfigError extends Error {}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function getApiBaseUrl() {
  return "https://api.lemonsqueezy.com";
}

function requireEnvValue(envKey: string, env: NodeJS.ProcessEnv = process.env) {
  const value = env[envKey]?.trim();
  if (!value) {
    throw new LemonConfigError(`${envKey} is not configured.`);
  }
  return value;
}

export function getAppUrl(env: NodeJS.ProcessEnv = process.env) {
  const value =
    env.APP_URL?.trim()
    || env.NEXT_PUBLIC_SITE_URL?.trim()
    || env.SITE_URL?.trim()
    || env.PUBLIC_URL?.trim()
    || env.AUTH_URL?.trim()
    || requireEnvValue("NEXT_PUBLIC_APP_URL", env);
  return getPublicAppOrigin(value);
}

function getLemonApiKey(env: NodeJS.ProcessEnv = process.env) {
  return requireEnvValue("LEMONSQUEEZY_API_KEY", env);
}

function getLemonStoreId(env: NodeJS.ProcessEnv = process.env) {
  return requireEnvValue("LEMONSQUEEZY_STORE_ID", env);
}

function getLemonWebhookSecret(env: NodeJS.ProcessEnv = process.env) {
  return requireEnvValue("LEMONSQUEEZY_WEBHOOK_SECRET", env);
}

function getLemonTestMode(env: NodeJS.ProcessEnv = process.env) {
  return parseBooleanEnv(env.LEMONSQUEEZY_TEST_MODE, env.NODE_ENV !== "production");
}

export function isLemonCheckoutConfigured(
  planKey: CheckoutPlanKey,
  env: NodeJS.ProcessEnv = process.env,
) {
  const baseReady =
    Boolean(env.LEMONSQUEEZY_API_KEY?.trim())
    && Boolean(env.LEMONSQUEEZY_STORE_ID?.trim())
    && Boolean((env.APP_URL ?? env.NEXT_PUBLIC_SITE_URL ?? env.SITE_URL ?? env.PUBLIC_URL ?? env.AUTH_URL ?? env.NEXT_PUBLIC_APP_URL)?.trim());

  if (!baseReady) return false;

  try {
    const variantId = resolveVariantId(planKey, env);
    return Boolean(variantId.trim());
  } catch {
    return false;
  }
}

async function lemonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init);
  const text = await response.text();
  const json = text ? JSON.parse(text) as LemonApiResponse<T> : {};

  if (!response.ok || !json.data) {
    const message = json.errors?.[0]?.detail || json.errors?.[0]?.title || "Lemon Squeezy request failed.";
    throw new Error(message);
  }

  return json.data;
}

function apiHeaders(apiKey: string) {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

type LemonCheckoutRequest = {
  apiKey: string;
  storeId: string;
  variantId: string;
  testMode: boolean;
  redirectUrl: string;
  locale: CheckoutLocale;
  email: string;
  name?: string | null;
  customData?: Record<string, string | undefined>;
  customPrice?: number;
  enabledVariants?: number[];
};

export function detectCheckoutLocale(headerValue: string | null | undefined): CheckoutLocale {
  return headerValue?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

async function createCheckoutSession(input: LemonCheckoutRequest) {
  const variantNumber = Number.parseInt(input.variantId, 10);
  if (!Number.isFinite(variantNumber)) {
    throw new LemonConfigError(`Invalid Lemon Squeezy variant id: ${input.variantId}`);
  }

  const checkout = await lemonRequest<LemonCheckoutData>("/v1/checkouts", {
    method: "POST",
    headers: apiHeaders(input.apiKey),
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          custom_price: input.customPrice,
          checkout_options: {
            embed: true,
            media: false,
            logo: true,
            desc: false,
            discount: true,
            subscription_preview: true,
            button_color: "#6d28d9",
            button_text_color: "#ffffff",
            headings_color: "#0f172a",
            primary_text_color: "#0f172a",
            secondary_text_color: "#475569",
            borders_color: "#e2e8f0",
            links_color: "#6d28d9",
            locale: input.locale,
          },
          checkout_data: {
            email: input.email,
            name: safeCheckoutName(input.name),
            custom: input.customData,
          },
          product_options: {
            redirect_url: input.redirectUrl,
            receipt_button_text: input.locale === "tr" ? "Panele don" : "Return to dashboard",
            receipt_link_url: input.redirectUrl,
            enabled_variants: input.enabledVariants ?? [variantNumber],
          },
          test_mode: input.testMode,
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: input.storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: input.variantId,
            },
          },
        },
      },
    }),
  });

  const url = checkout.attributes?.url?.trim();
  if (!url) {
    throw new Error("Lemon Squeezy checkout url was not returned.");
  }

  return { url };
}

export async function createLemonCheckout(input: {
  planKey: CheckoutPlanKey;
  email: string;
  name?: string | null;
  userId: string;
  locale: CheckoutLocale;
}) {
  const apiKey = getLemonApiKey();
  const storeId = getLemonStoreId();
  const appUrl = getAppUrl();
  const testMode = getLemonTestMode();
  let variantId: string;

  try {
    variantId = resolveVariantId(input.planKey);
  } catch (error) {
    throw new LemonConfigError(error instanceof Error ? error.message : "Missing billing variant configuration.");
  }

  const variantNumber = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNumber)) {
    throw new LemonConfigError(`Invalid Lemon Squeezy variant id: ${variantId}`);
  }

  const redirectUrl = `${appUrl}/dashboard?payment=success`;
  return createCheckoutSession({
    apiKey,
    storeId,
    variantId,
    testMode,
    redirectUrl,
    locale: input.locale,
    email: input.email,
    name: safeCheckoutName(input.name),
    customData: {
      user_id: input.userId,
      plan_key: input.planKey,
    },
    enabledVariants: [variantNumber],
  });
}

export async function createCustomLemonCheckout(input: {
  variantId: string;
  email: string;
  name?: string | null;
  locale: CheckoutLocale;
  redirectPath?: string;
  customPrice: number;
  customData?: Record<string, string | undefined>;
}) {
  const apiKey = getLemonApiKey();
  const storeId = getLemonStoreId();
  const appUrl = getAppUrl();
  const testMode = getLemonTestMode();
  const redirectUrl = `${appUrl}${input.redirectPath ?? "/pricing/enterprise?quote=success"}`;

  if (!Number.isInteger(input.customPrice) || input.customPrice <= 0) {
    throw new LemonConfigError("Invalid custom checkout price.");
  }

  return createCheckoutSession({
    apiKey,
    storeId,
    variantId: input.variantId,
    testMode,
    redirectUrl,
    locale: input.locale,
    email: input.email,
    name: safeCheckoutName(input.name),
    customData: input.customData,
    customPrice: input.customPrice,
  });
}

export async function retrieveLemonSubscription(subscriptionId: string) {
  const apiKey = getLemonApiKey();
  const data = await lemonRequest<LemonSubscriptionData>(`/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
    headers: apiHeaders(apiKey),
  });

  if (!data.attributes) {
    throw new Error("Lemon Squeezy subscription payload is incomplete.");
  }

  return data;
}

export async function retrieveLemonCustomerPortal(customerId: string) {
  const apiKey = getLemonApiKey();
  const data = await lemonRequest<LemonCustomerData>(`/v1/customers/${customerId}`, {
    method: "GET",
    headers: apiHeaders(apiKey),
  });

  return data.attributes?.urls?.customer_portal?.trim() || null;
}

export function hashPayload(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

export type LemonSignatureVerification =
  | { valid: true }
  | { valid: false; reason: "missing_secret" | "missing_signature" | "signature_mismatch" };

/**
 * Verifies the X-Signature header using HMAC SHA-256 + timingSafeEqual.
 * Never logs the secret or the raw body — callers should only log `reason`.
 */
export function verifyLemonSignatureDetailed(
  rawBody: string,
  signatureHeader: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): LemonSignatureVerification {
  if (!signatureHeader) {
    return { valid: false, reason: "missing_signature" };
  }

  let webhookSecret: string;
  try {
    webhookSecret = getLemonWebhookSecret(env);
  } catch {
    return { valid: false, reason: "missing_secret" };
  }

  const digest = Buffer.from(
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex"),
    "utf8",
  );
  const signature = Buffer.from(signatureHeader, "utf8");

  if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return { valid: true };
}

export function verifyLemonSignature(rawBody: string, signatureHeader: string | null | undefined) {
  return verifyLemonSignatureDetailed(rawBody, signatureHeader).valid;
}

import crypto from "crypto";
import type { CheckoutPlanKey } from "@/lib/billing/plans";
import { resolveVariantId } from "@/lib/billing/plans";

export type CheckoutLocale = "tr" | "en";

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

export function getAppUrl(env: NodeJS.ProcessEnv = process.env) {
  const value = env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) {
    throw new LemonConfigError("NEXT_PUBLIC_APP_URL is not configured.");
  }
  return value.replace(/\/+$/, "");
}

export function getLemonConfig(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = env.LEMONSQUEEZY_STORE_ID?.trim();
  const webhookSecret = env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!apiKey || !storeId || !webhookSecret) {
    throw new LemonConfigError("Lemon Squeezy billing environment variables are incomplete.");
  }

  return {
    apiKey,
    storeId,
    webhookSecret,
    appUrl: getAppUrl(env),
    testMode: parseBooleanEnv(env.LEMONSQUEEZY_TEST_MODE, env.NODE_ENV !== "production"),
  };
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

export function detectCheckoutLocale(headerValue: string | null | undefined): CheckoutLocale {
  return headerValue?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export async function createLemonCheckout(input: {
  planKey: CheckoutPlanKey;
  email: string;
  name?: string | null;
  userId: string;
  locale: CheckoutLocale;
}) {
  const config = getLemonConfig();
  const variantId = resolveVariantId(input.planKey);
  const variantNumber = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNumber)) {
    throw new LemonConfigError(`Invalid Lemon Squeezy variant id: ${variantId}`);
  }

  const redirectUrl = `${config.appUrl}/dashboard?payment=success`;
  const receiptButtonText = input.locale === "tr" ? "Panele don" : "Return to dashboard";

  const checkout = await lemonRequest<LemonCheckoutData>("/v1/checkouts", {
    method: "POST",
    headers: apiHeaders(config.apiKey),
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
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
            name: input.name ?? undefined,
            custom: {
              user_id: input.userId,
              plan_key: input.planKey,
            },
          },
          product_options: {
            redirect_url: redirectUrl,
            receipt_button_text: receiptButtonText,
            receipt_link_url: redirectUrl,
            enabled_variants: [variantNumber],
          },
          test_mode: config.testMode,
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: config.storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
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

export async function retrieveLemonSubscription(subscriptionId: string) {
  const config = getLemonConfig();
  const data = await lemonRequest<LemonSubscriptionData>(`/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
    headers: apiHeaders(config.apiKey),
  });

  if (!data.attributes) {
    throw new Error("Lemon Squeezy subscription payload is incomplete.");
  }

  return data;
}

export function hashPayload(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

export function verifyLemonSignature(rawBody: string, signatureHeader: string | null | undefined) {
  if (!signatureHeader) return false;
  const { webhookSecret } = getLemonConfig();
  const digest = Buffer.from(
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex"),
    "utf8",
  );
  const signature = Buffer.from(signatureHeader, "utf8");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

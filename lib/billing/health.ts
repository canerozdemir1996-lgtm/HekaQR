import { CHECKOUT_PLAN_KEYS, getCheckoutPlanMeta, type CheckoutPlanKey } from "@/lib/billing/plans";
import { getAppUrl } from "@/lib/billing/lemon-squeezy";

export type BillingHealthLevel = "ok" | "warn" | "error";

export type BillingHealthVariant = {
  planKey: CheckoutPlanKey;
  planLabel: string;
  variantId: string | null;
  status: BillingHealthLevel;
  configured: boolean;
  reachable: boolean;
  variantName: string | null;
  productName: string | null;
  variantStatus: string | null;
  productStatus: string | null;
  isSubscription: boolean | null;
  testModeMatches: boolean | null;
  storeMatches: boolean | null;
  storeId: string | null;
  price: number | null;
  message: string | null;
};

export type BillingHealthReport = {
  checkedAt: string;
  status: BillingHealthLevel;
  mode: "test" | "live";
  appUrl: string | null;
  env: {
    apiKeyConfigured: boolean;
    storeConfigured: boolean;
    webhookConfigured: boolean;
    appUrlConfigured: boolean;
  };
  store: {
    configured: boolean;
    reachable: boolean;
    id: string | null;
    name: string | null;
    message: string | null;
  };
  variants: BillingHealthVariant[];
  issues: string[];
};

type LemonErrorResponse = {
  errors?: Array<{ detail?: string; title?: string; status?: string }>;
};

type LemonResource<T = Record<string, unknown>> = {
  id: string;
  type: string;
  attributes?: T;
};

type LemonDocument<T = Record<string, unknown>> = {
  data?: LemonResource<T>;
  errors?: Array<{ detail?: string; title?: string; status?: string }>;
};

type LemonStoreAttributes = {
  name?: string;
};

type LemonVariantAttributes = {
  product_id?: number | string | null;
  name?: string | null;
  price?: number | null;
  is_subscription?: boolean | null;
  status?: string | null;
  test_mode?: boolean | null;
};

type LemonProductAttributes = {
  store_id?: number | string | null;
  name?: string | null;
  status?: string | null;
};

function readEnvValue(key: string, env: NodeJS.ProcessEnv = process.env) {
  return env[key]?.trim() || null;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function getMode(env: NodeJS.ProcessEnv = process.env): "test" | "live" {
  return parseBooleanEnv(env.LEMONSQUEEZY_TEST_MODE, env.NODE_ENV !== "production") ? "test" : "live";
}

function levelRank(level: BillingHealthLevel) {
  if (level === "error") return 2;
  if (level === "warn") return 1;
  return 0;
}

function mergeLevel(current: BillingHealthLevel, next: BillingHealthLevel) {
  return levelRank(next) > levelRank(current) ? next : current;
}

async function lemonGet<T>(
  path: string,
  apiKey: string,
): Promise<LemonResource<T>> {
  const response = await fetch(`https://api.lemonsqueezy.com${path}`, {
    method: "GET",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as LemonDocument<T> & LemonErrorResponse) : {};

  if (!response.ok || !json.data) {
    const message = json.errors?.[0]?.detail || json.errors?.[0]?.title || "Lemon Squeezy request failed.";
    throw new Error(message);
  }

  return json.data;
}

function planLabel(planKey: CheckoutPlanKey) {
  const meta = getCheckoutPlanMeta(planKey);
  const cycle = meta.billing === "yearly" ? "Yearly" : "Monthly";
  return `${meta.plan.charAt(0).toUpperCase()}${meta.plan.slice(1)} ${cycle}`;
}

export async function getBillingHealthReport(
  env: NodeJS.ProcessEnv = process.env,
): Promise<BillingHealthReport> {
  const mode = getMode(env);
  const apiKey = readEnvValue("LEMONSQUEEZY_API_KEY", env);
  const configuredStoreId = readEnvValue("LEMONSQUEEZY_STORE_ID", env);
  const webhookSecret = readEnvValue("LEMONSQUEEZY_WEBHOOK_SECRET", env);
  const appUrl = (() => {
    try {
      return getAppUrl(env);
    } catch {
      return null;
    }
  })();

  let overall: BillingHealthLevel = "ok";
  const issues: string[] = [];

  const report: BillingHealthReport = {
    checkedAt: new Date().toISOString(),
    status: "ok",
    mode,
    appUrl,
    env: {
      apiKeyConfigured: Boolean(apiKey),
      storeConfigured: Boolean(configuredStoreId),
      webhookConfigured: Boolean(webhookSecret),
      appUrlConfigured: Boolean(appUrl),
    },
    store: {
      configured: Boolean(configuredStoreId),
      reachable: false,
      id: configuredStoreId,
      name: null,
      message: null,
    },
    variants: [],
    issues,
  };

  if (!apiKey) {
    overall = mergeLevel(overall, "error");
    issues.push("LEMONSQUEEZY_API_KEY eksik.");
  }
  if (!configuredStoreId) {
    overall = mergeLevel(overall, "error");
    issues.push("LEMONSQUEEZY_STORE_ID eksik.");
  }
  if (!appUrl) {
    overall = mergeLevel(overall, "error");
    issues.push("APP_URL veya NEXT_PUBLIC_APP_URL eksik.");
  }
  if (!webhookSecret) {
    overall = mergeLevel(overall, "warn");
    issues.push("LEMONSQUEEZY_WEBHOOK_SECRET eksik. Odeme tamamlansa bile abonelik senkronu gecikebilir.");
  }

  if (apiKey && configuredStoreId) {
    try {
      const store = await lemonGet<LemonStoreAttributes>(`/v1/stores/${configuredStoreId}`, apiKey);
      report.store.reachable = true;
      report.store.name = store.attributes?.name ?? null;
    } catch (error) {
      overall = mergeLevel(overall, "error");
      report.store.message = error instanceof Error ? error.message : "Store okunamadi.";
      issues.push(`Store ulasilamiyor: ${report.store.message}`);
    }
  }

  report.variants = await Promise.all(
    CHECKOUT_PLAN_KEYS.map(async (planKey) => {
      const meta = getCheckoutPlanMeta(planKey);
      const variantId = readEnvValue(meta.variantEnvKey, env);
      const variantReport: BillingHealthVariant = {
        planKey,
        planLabel: planLabel(planKey),
        variantId,
        status: "ok",
        configured: Boolean(variantId),
        reachable: false,
        variantName: null,
        productName: null,
        variantStatus: null,
        productStatus: null,
        isSubscription: null,
        testModeMatches: null,
        storeMatches: null,
        storeId: null,
        price: null,
        message: null,
      };

      if (!variantId) {
        variantReport.status = "error";
        variantReport.message = `${meta.variantEnvKey} eksik.`;
        return variantReport;
      }

      if (!apiKey) {
        variantReport.status = "error";
        variantReport.message = "API key eksik oldugu icin variant dogrulanamadi.";
        return variantReport;
      }

      try {
        const variant = await lemonGet<LemonVariantAttributes>(`/v1/variants/${variantId}`, apiKey);
        variantReport.reachable = true;
        variantReport.variantName = variant.attributes?.name ?? null;
        variantReport.variantStatus = variant.attributes?.status ?? null;
        variantReport.price = typeof variant.attributes?.price === "number" ? variant.attributes.price : null;
        variantReport.isSubscription = typeof variant.attributes?.is_subscription === "boolean"
          ? variant.attributes.is_subscription
          : null;
        variantReport.testModeMatches = typeof variant.attributes?.test_mode === "boolean"
          ? variant.attributes.test_mode === (mode === "test")
          : null;

        const productId = variant.attributes?.product_id;
        if (productId !== null && productId !== undefined) {
          const product = await lemonGet<LemonProductAttributes>(`/v1/products/${productId}`, apiKey);
          variantReport.productName = product.attributes?.name ?? null;
          variantReport.productStatus = product.attributes?.status ?? null;
          variantReport.storeId = product.attributes?.store_id != null ? String(product.attributes.store_id) : null;
          variantReport.storeMatches = configuredStoreId ? variantReport.storeId === configuredStoreId : null;
        }

        const messages: string[] = [];
        let level: BillingHealthLevel = "ok";

        const variantState = variantReport.variantStatus?.toLowerCase();
        if (variantState && variantState !== "published" && variantState !== "pending") {
          level = mergeLevel(level, "error");
          messages.push(`Variant durumu ${variantReport.variantStatus}.`);
        }

        const productState = variantReport.productStatus?.toLowerCase();
        if (productState && productState !== "published") {
          level = mergeLevel(level, "error");
          messages.push(`Product durumu ${variantReport.productStatus}.`);
        }

        if (variantReport.isSubscription === false) {
          level = mergeLevel(level, "error");
          messages.push("Subscription urunu degil.");
        }

        if (variantReport.testModeMatches === false) {
          level = mergeLevel(level, "error");
          messages.push(`Variant ${mode} moduyla eslesmiyor.`);
        }

        if (variantReport.storeMatches === false) {
          level = mergeLevel(level, "error");
          messages.push(`Variant store ${variantReport.storeId} ile eslesiyor, beklenen ${configuredStoreId}.`);
        }

        variantReport.status = level;
        variantReport.message = messages.length ? messages.join(" ") : "Variant saglikli.";
      } catch (error) {
        variantReport.status = "error";
        variantReport.message = error instanceof Error ? error.message : "Variant okunamadi.";
      }

      return variantReport;
    }),
  );

  for (const variant of report.variants) {
    overall = mergeLevel(overall, variant.status);
    if (variant.status !== "ok" && variant.message) {
      issues.push(`${variant.planLabel}: ${variant.message}`);
    }
  }

  report.status = overall;
  return report;
}

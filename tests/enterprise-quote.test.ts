import assert from "node:assert/strict";
import test from "node:test";
import {
  enterpriseQuoteRequestSchema,
  normalizeEnterpriseContact,
  normalizeEnterprisePhone,
  sanitizeEnterpriseBillingPreference,
  sanitizeEnterpriseConfiguration,
} from "../lib/enterprise/quote-schema";
import {
  assertEnterpriseRateLimits,
  buildEnterpriseQuoteNumber,
  getEnterpriseSelectedPriceCents,
  isEnterpriseSelfServeCheckoutEnabled,
  resolveEnterpriseVariantId,
} from "../lib/enterprise/quote-service";

const validRequest = {
  contact: {
    fullName: "Caner Ozdemir",
    company: "Ornek Sirket",
    email: "ornek@example.com",
    phone: "+90 555 111 22 33",
    note: "Kurulum ve onboarding ihtiyacimiz var.",
  },
  configuration: {
    dynamicQr: 500,
    menuQr: 40,
    vcardPages: 80,
    monthlyScans: 300_000,
    teamMembers: 15,
    whiteLabelDomains: 3,
  },
  billingPreference: "yearly",
};

test("quote request schema strips untrusted frontend price fields", () => {
  const parsed = enterpriseQuoteRequestSchema.parse({
    ...validRequest,
    monthlyPrice: 1,
    totalPrice: 2,
    customPrice: 3,
    variantId: "frontend-variant",
  });

  assert.equal("monthlyPrice" in parsed, false);
  assert.equal("totalPrice" in parsed, false);
  assert.equal("customPrice" in parsed, false);
  assert.equal("variantId" in parsed, false);
});

test("invalid email and invalid slider values are rejected", () => {
  assert.equal(
    enterpriseQuoteRequestSchema.safeParse({
      ...validRequest,
      contact: { ...validRequest.contact, email: "not-an-email" },
    }).success,
    false,
  );

  assert.throws(() =>
    sanitizeEnterpriseConfiguration({
      ...validRequest.configuration,
      dynamicQr: 10,
    }, "strict"),
  );
});

test("contact normalization lowercases email and normalizes phone", () => {
  const normalized = normalizeEnterpriseContact({
    fullName: "Caner Ozdemir",
    company: "Ornek Sirket",
    email: "ORNEK@EXAMPLE.COM",
    phone: "+90 (555) 111 22 33",
    note: "  not  ",
  });

  assert.equal(normalized.email, "ornek@example.com");
  assert.equal(normalized.phone, "+905551112233");
  assert.equal(normalized.note, "not");
  assert.equal(normalizeEnterprisePhone("0555 111 22 33"), "05551112233");
});

test("quote number generation is readable and stable", () => {
  assert.equal(
    buildEnterpriseQuoteNumber(123, new Date("2026-06-18T00:00:00.000Z")),
    "Q-2026-000123",
  );
});

test("rate limit rules reject excessive requests", () => {
  assert.throws(() =>
    assertEnterpriseRateLimits({ ipCount: 5, emailCount: 0 }),
  );
  assert.throws(() =>
    assertEnterpriseRateLimits({ ipCount: 0, emailCount: 3 }),
  );
  assert.doesNotThrow(() =>
    assertEnterpriseRateLimits({ ipCount: 4, emailCount: 2 }),
  );
});

test("self-serve checkout flag and enterprise variant selection are resolved server-side", () => {
  const env = {
    ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT: "true",
    LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID: "801",
    LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID: "901",
  } as unknown as NodeJS.ProcessEnv;

  assert.equal(isEnterpriseSelfServeCheckoutEnabled(env), true);
  assert.equal(resolveEnterpriseVariantId("monthly", env), "801");
  assert.equal(resolveEnterpriseVariantId("yearly", env), "901");
});

test("selected checkout price is always recomputed from backend configuration", () => {
  const configuration = sanitizeEnterpriseConfiguration(validRequest.configuration, "strict");

  assert.equal(sanitizeEnterpriseBillingPreference("monthly"), "monthly");
  assert.equal(sanitizeEnterpriseBillingPreference("invalid"), "yearly");
  assert.equal(getEnterpriseSelectedPriceCents("monthly", configuration), 580_000);
  assert.equal(getEnterpriseSelectedPriceCents("yearly", configuration), 5_568_000);
});

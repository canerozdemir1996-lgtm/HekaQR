import assert from "node:assert/strict";
import test from "node:test";
import {
  findCheckoutPlanKeyByVariantId,
  isCheckoutPlanKey,
  isStandardCheckoutPlanKey,
  resolveVariantId,
} from "../lib/billing/plans";
import { resolveCheckoutPlanKey } from "../lib/billing/subscriptions";
import { resolveEnterpriseCheckoutPlanKey } from "../lib/enterprise/quote-service";
import { applyEnterpriseLimits, getLimits, type EnterpriseLimitsSnapshot } from "../lib/plan-limits";

const ENTERPRISE_ENV = {
  LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID: "801",
  LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID: "901",
} as unknown as NodeJS.ProcessEnv;

test("enterprise checkout keys are recognized as checkout keys but excluded from the standard checkout", () => {
  assert.equal(isCheckoutPlanKey("enterprise_monthly"), true);
  assert.equal(isCheckoutPlanKey("enterprise_yearly"), true);

  // Standard checkout (fixed price) must never accept enterprise — that path has
  // no custom_price and would charge the bare variant amount.
  assert.equal(isStandardCheckoutPlanKey("enterprise_monthly"), false);
  assert.equal(isStandardCheckoutPlanKey("enterprise_yearly"), false);
  assert.equal(isStandardCheckoutPlanKey("pro_yearly"), true);
  assert.equal(isStandardCheckoutPlanKey("starter_monthly"), true);
});

test("enterprise variant ids resolve to enterprise checkout keys (both directions)", () => {
  assert.equal(resolveVariantId("enterprise_monthly", ENTERPRISE_ENV), "801");
  assert.equal(resolveVariantId("enterprise_yearly", ENTERPRISE_ENV), "901");
  assert.equal(findCheckoutPlanKeyByVariantId("801", ENTERPRISE_ENV), "enterprise_monthly");
  assert.equal(findCheckoutPlanKeyByVariantId("901", ENTERPRISE_ENV), "enterprise_yearly");
});

test("webhook plan resolution: enterprise resolves from explicit plan_key and from the variant id", () => {
  // Explicit plan_key from checkout custom_data.
  assert.equal(resolveCheckoutPlanKey({ explicitPlanKey: "enterprise_yearly" }), "enterprise_yearly");

  // Variant-only fallback (no plan_key echoed) still resolves enterprise.
  const previous = {
    monthly: process.env.LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID,
    yearly: process.env.LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID,
  };
  process.env.LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID = "801";
  process.env.LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID = "901";

  assert.equal(resolveCheckoutPlanKey({ variantId: "901" }), "enterprise_yearly");
  assert.equal(resolveCheckoutPlanKey({ variantId: "801", existingPlanKey: null }), "enterprise_monthly");

  process.env.LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID = previous.monthly;
  process.env.LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID = previous.yearly;
});

test("resolveEnterpriseCheckoutPlanKey maps billing preference to the enterprise plan key", () => {
  assert.equal(resolveEnterpriseCheckoutPlanKey("monthly"), "enterprise_monthly");
  assert.equal(resolveEnterpriseCheckoutPlanKey("yearly"), "enterprise_yearly");
});

test("applyEnterpriseLimits maps every purchased slider onto its enforcement field", () => {
  const base = getLimits("enterprise");
  const snapshot: EnterpriseLimitsSnapshot = {
    dynamicQr: 500,
    monthlyScans: 300_000,
    teamMembers: 15,
    menuQr: 40,
    vcardPages: 80,
    whiteLabelDomains: 3,
  };

  const limits = applyEnterpriseLimits(base, snapshot);
  // Total QR budget is the sum of the separately-priced per-type sliders.
  assert.equal(limits.max_qr, 620);
  assert.equal(limits.max_menu_qr, 40);
  assert.equal(limits.max_vcard_pages, 80);
  assert.equal(limits.max_monthly_scans, 300_000);
  assert.equal(limits.org_members, 15);
  assert.equal(limits.max_white_label_domains, 3);
  // Metrics without an enforcement field stay at the enterprise default.
  assert.equal(limits.styles, base.styles);
  assert.equal(limits.custom_domain, true);
});

test("applyEnterpriseLimits returns the base tier untouched when there is no snapshot or values are invalid", () => {
  const base = getLimits("enterprise");
  assert.deepEqual(applyEnterpriseLimits(base, null), base);
  assert.deepEqual(applyEnterpriseLimits(base, undefined), base);

  // Zero / negative are ignored (never lock a paying customer to 0).
  const guarded = applyEnterpriseLimits(base, { dynamicQr: 0, monthlyScans: -5, teamMembers: 0 });
  assert.equal(guarded.max_qr, base.max_qr);
  assert.equal(guarded.max_monthly_scans, base.max_monthly_scans);
  assert.equal(guarded.org_members, base.org_members);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEnterpriseSearchParams,
  calculateEnterprisePricing,
  formatEnterpriseCurrency,
  getEnterpriseDefaultConfiguration,
  normalizeEnterpriseConfiguration,
  normalizeEnterpriseMetric,
  parseEnterpriseConfigurationFromSearch,
} from "../lib/pricing/enterprise-pricing";

test("default enterprise configuration produces the expected reference estimate", () => {
  const defaults = getEnterpriseDefaultConfiguration();
  const pricing = calculateEnterprisePricing(defaults);

  assert.equal(pricing.monthlyCents, 580_000);
  assert.equal(pricing.annualCents, 5_568_000);
  assert.equal(pricing.annualMonthlyEquivalentCents, 464_000);
});

test("enterprise pricing always uses integer cents", () => {
  const pricing = calculateEnterprisePricing({
    dynamicQr: 1750,
    menuQr: 120,
    vcardPages: 260,
    monthlyScans: 1_250_000,
    teamMembers: 35,
    whiteLabelDomains: 8,
  });

  assert.equal(Number.isInteger(pricing.monthlyCents), true);
  assert.equal(Number.isInteger(pricing.annualCents), true);
});

test("invalid query values are normalized and clamped", () => {
  const params = new URLSearchParams(
    "dynamicQr=abc&menuQr=400&vcardPages=5&monthlyScans=125500&teamMembers=2&whiteLabelDomains=99",
  );

  const parsed = parseEnterpriseConfigurationFromSearch(params);

  assert.equal(parsed.dynamicQr, 500);
  assert.equal(parsed.menuQr, 300);
  assert.equal(parsed.vcardPages, 20);
  assert.equal(parsed.monthlyScans, 150_000);
  assert.equal(parsed.teamMembers, 5);
  assert.equal(parsed.whiteLabelDomains, 20);
});

test("strict slider validation rejects out-of-range values", () => {
  assert.throws(() => normalizeEnterpriseMetric("dynamicQr", 149, "strict"));
  assert.throws(() => normalizeEnterpriseConfiguration({ monthlyScans: 2_500_000 }, "strict"));
});

test("search params can be rebuilt from enterprise state", () => {
  const params = buildEnterpriseSearchParams(
    {
      dynamicQr: 500,
      menuQr: 40,
      vcardPages: 80,
      monthlyScans: 300_000,
      teamMembers: 15,
      whiteLabelDomains: 3,
    },
    "yearly",
  );

  assert.equal(params.get("dynamicQr"), "500");
  assert.equal(params.get("billing"), "yearly");
});

test("enterprise currency formatting stays in TRY", () => {
  assert.equal(formatEnterpriseCurrency(580_000, "tr"), "₺5.800");
});

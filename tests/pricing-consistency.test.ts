import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_LIMITS } from "../lib/plan-limits";
import { comparisonRows, pricingPlans } from "../lib/pricing";

test("advertised QR capacities match enforced plan limits", () => {
  const dynamic = comparisonRows.find((row) => row.key === "dynamic");
  assert.ok(dynamic);
  assert.equal(dynamic.values.free.tr, String(PLAN_LIMITS.free.max_qr));
  assert.equal(dynamic.values.starter.tr, String(PLAN_LIMITS.starter.max_qr));
  assert.equal(dynamic.values.pro.tr, String(PLAN_LIMITS.pro.max_qr));

  const pro = pricingPlans.find((plan) => plan.key === "pro");
  assert.ok(pro?.bullets.some((bullet) => bullet.tr.includes(String(PLAN_LIMITS.pro.max_qr))));
});

test("advertised team capacities match enforced plan limits", () => {
  const team = comparisonRows.find((row) => row.key === "team");
  assert.ok(team);
  assert.match(team.values.starter.tr, new RegExp(`^${PLAN_LIMITS.starter.org_members}\\b`));
  assert.match(team.values.pro.tr, new RegExp(`^${PLAN_LIMITS.pro.org_members}\\b`));
});

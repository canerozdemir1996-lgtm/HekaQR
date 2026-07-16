import assert from "node:assert/strict";
import test from "node:test";
import { planBadgePresentation, planTheme, planUiLabel } from "../lib/plan-ui";

test("known and custom plan labels have stable fallbacks", () => {
  assert.equal(planUiLabel("basic"), "Starter");
  assert.equal(planUiLabel("lifetime"), "Lifetime");
  assert.equal(planUiLabel("agency_custom"), "Agency Custom");
  assert.equal(planUiLabel("pro", "Kurumsal Pro"), "Kurumsal Pro");
});

test("active and unhealthy subscription states are never ambiguous", () => {
  assert.deepEqual(planBadgePresentation("pro", "active", "Pro Paket"), {
    planKey: "pro",
    statusKey: "active",
    label: "Pro Paket",
    statusLabel: "Aktif",
    visibleLabel: "Pro Paket",
    ariaLabel: "Pro Paket planı, Aktif",
    isAttention: false,
  });

  const expired = planBadgePresentation("vip", "expired");
  assert.equal(expired.visibleLabel, "VIP · Süresi doldu");
  assert.equal(expired.isAttention, true);

  const cancelled = planBadgePresentation("lifetime", "cancelled");
  assert.equal(cancelled.visibleLabel, "Lifetime · İptal edildi");
  assert.equal(cancelled.isAttention, true);
});

test("all promised plan families have explicit contrast tokens", () => {
  for (const plan of ["free", "starter", "pro", "business", "enterprise", "vip", "lifetime", "custom"]) {
    const theme = planTheme(plan);
    assert.match(theme.badge, /bg-/);
    assert.match(theme.badge, /text-/);
    assert.match(theme.badge, /dark:/);
  }
});

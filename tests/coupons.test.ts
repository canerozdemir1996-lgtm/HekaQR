import assert from "node:assert/strict";
import test from "node:test";
import { couponValidUntilToIso, generateCouponCode, normalizeCouponCode } from "../lib/coupons";

test("coupon codes are normalized for stable redemption", () => {
  assert.equal(normalizeCouponCode(" yaz 2026 "), "YAZ-2026");
});

test("generated coupon codes include a safe prefix", () => {
  assert.match(generateCouponCode(" yaz "), /^YAZ-[A-F0-9]{10}$/);
});

test("date-only coupon validity resolves to end of day UTC", () => {
  assert.equal(couponValidUntilToIso("2026-07-01"), "2026-07-01T23:59:59.999Z");
});

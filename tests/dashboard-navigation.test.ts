import assert from "node:assert/strict";
import test from "node:test";
import { resolveDashboardCapabilities } from "../lib/dashboard-navigation";

test("dashboard navigation hides unused operational modules", () => {
  assert.deepEqual(resolveDashboardCapabilities([]), {
    orders: false,
    bookings: false,
    feedback: false,
    exams: false,
  });
});

test("dashboard navigation follows the QR types the user actually owns", () => {
  assert.deepEqual(
    resolveDashboardCapabilities([
      { qr_type: "menu" },
      { qr_type: "feedback" },
      { qr_type: "url" },
      { qr_type: "quiz" },
    ]),
    { orders: true, bookings: false, feedback: true, exams: true },
  );
});

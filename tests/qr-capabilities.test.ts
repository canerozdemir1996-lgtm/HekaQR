import assert from "node:assert/strict";
import test from "node:test";
import { getQrCapability, resolveQrMode, supportsQrMode } from "../lib/qr-capabilities";

test("static-only QR types never offer managed redirect mode", () => {
  assert.equal(supportsQrMode("wifi", "static"), true);
  assert.equal(supportsQrMode("wifi", "dynamic"), false);
  assert.equal(getQrCapability("text").supportsAnalytics, false);
});

test("hosted QR types require dynamic mode", () => {
  assert.equal(supportsQrMode("menu", "static"), false);
  assert.equal(supportsQrMode("menu", "dynamic"), true);
  assert.equal(supportsQrMode("multi", "static"), false);
});

test("simple URL QR types support both modes", () => {
  assert.equal(supportsQrMode("url", "static"), true);
  assert.equal(supportsQrMode("url", "dynamic"), true);
});

test("explicit qr_mode has priority over legacy fields", () => {
  assert.deepEqual(resolveQrMode({ qr_mode: "static", is_dynamic: true, qr_type: "url" }), { mode: "static", source: "qr_mode" });
});

test("legacy records use is_dynamic and static payload fallbacks", () => {
  assert.equal(resolveQrMode({ qr_type: "url", is_dynamic: false }).mode, "static");
  assert.equal(resolveQrMode({ qr_type: "url", static_payload: "https://example.com" }).mode, "static");
});

test("legacy capability fallback is safe and deterministic", () => {
  assert.deepEqual(resolveQrMode({ qr_type: "wifi" }), { mode: "static", source: "capability" });
  assert.deepEqual(resolveQrMode({ qr_type: "menu" }), { mode: "dynamic", source: "capability" });
  assert.deepEqual(resolveQrMode({ qr_type: "url" }), { mode: "dynamic", source: "legacy_default" });
});

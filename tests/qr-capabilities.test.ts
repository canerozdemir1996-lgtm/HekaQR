import assert from "node:assert/strict";
import test from "node:test";
import { getQrCapability, supportsQrMode } from "../lib/qr-capabilities";

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

import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseQrTemplate,
  hasQrTemplateSelection,
  resolveQrTemplateId,
  resolveQrDesignOverride,
  toApiQrTemplate,
} from "../lib/qr-templates";

test("resolveQrTemplateId: template_id takes priority over style_id", () => {
  assert.equal(resolveQrTemplateId({ template_id: "template-1", style_id: "style-1" }), "template-1");
  assert.equal(resolveQrTemplateId({ style_id: "style-1" }), "style-1");
  assert.equal(resolveQrTemplateId({ template_id: null, style_id: "style-1" }), null);
});

test("resolveQrDesignOverride: templates stay live until the QR is customized", () => {
  const config = { dotColor: "#111111" };
  assert.equal(resolveQrDesignOverride(false, config), null);
  assert.deepEqual(resolveQrDesignOverride(true, config), config);
});

test("hasQrTemplateSelection: detects explicit template/style fields", () => {
  assert.equal(hasQrTemplateSelection({}), false);
  assert.equal(hasQrTemplateSelection({ template_id: null }), true);
  assert.equal(hasQrTemplateSelection({ style_id: null }), true);
});

test("canUseQrTemplate: allows own, system and public templates only", () => {
  assert.equal(canUseQrTemplate({ id: "1", name: "Own", user_id: "u1" }, "u1"), true);
  assert.equal(canUseQrTemplate({ id: "2", name: "System", visibility: "system" }, "u1"), true);
  assert.equal(canUseQrTemplate({ id: "3", name: "Public", visibility: "public" }, "u1"), true);
  assert.equal(canUseQrTemplate({ id: "4", name: "Private", user_id: "u2", visibility: "private" }, "u1"), false);
});

test("toApiQrTemplate: hides user_id and returns stable API shape", () => {
  const template = toApiQrTemplate({
    id: "template-1",
    name: "Brand",
    user_id: "u1",
    category: "brand",
    visibility: "private",
    config: { dotColor: "#111111" },
  }, "u1");

  assert.equal(template.id, "template-1");
  assert.equal(template.scope, "own");
  assert.equal(template.category, "brand");
  assert.deepEqual(template.config, { dotColor: "#111111" });
  assert.equal(Object.prototype.hasOwnProperty.call(template, "user_id"), false);
});

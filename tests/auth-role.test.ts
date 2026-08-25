import test from "node:test";
import assert from "node:assert/strict";
import { roleFromMetadata } from "../lib/auth";

test("user-editable metadata never grants an application role", () => {
  assert.equal(roleFromMetadata({ user_metadata: { role: "admin" } }), "user");
  assert.equal(roleFromMetadata({ user_metadata: { role: "owner" } }), "user");
});

test("server-controlled app metadata grants the configured role", () => {
  assert.equal(roleFromMetadata({ app_metadata: { role: "admin" } }), "admin");
  assert.equal(roleFromMetadata({ app_metadata: { role: "owner" } }), "owner");
});

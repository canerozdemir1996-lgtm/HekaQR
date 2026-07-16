import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageBulkImportForOrganization,
  canUseBulkImportFolder,
  canUseBulkImportStyle,
} from "../lib/server/bulk-import-access";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

test("bulk organization imports require an active write-capable role", () => {
  for (const role of ["owner", "admin", "editor"]) {
    assert.equal(canManageBulkImportForOrganization({ role, status: "active" }), true);
  }
  assert.equal(canManageBulkImportForOrganization({ role: "viewer", status: "active" }), false);
  assert.equal(canManageBulkImportForOrganization({ role: "admin", status: "invited" }), false);
  assert.equal(canManageBulkImportForOrganization(null), false);
});

test("bulk folders are restricted to their owner", () => {
  assert.equal(canUseBulkImportFolder({ user_id: USER_ID }, USER_ID), true);
  assert.equal(canUseBulkImportFolder({ user_id: OTHER_USER_ID }, USER_ID), false);
  assert.equal(canUseBulkImportFolder(null, USER_ID), false);
});

test("bulk styles allow own, system and public resources only", () => {
  assert.equal(canUseBulkImportStyle({ user_id: USER_ID, visibility: "private" }, USER_ID), true);
  assert.equal(canUseBulkImportStyle({ user_id: OTHER_USER_ID, visibility: "system" }, USER_ID), true);
  assert.equal(canUseBulkImportStyle({ user_id: OTHER_USER_ID, visibility: "public" }, USER_ID), true);
  assert.equal(canUseBulkImportStyle({ user_id: OTHER_USER_ID, visibility: "private" }, USER_ID), false);
  assert.equal(canUseBulkImportStyle(null, USER_ID), false);
});

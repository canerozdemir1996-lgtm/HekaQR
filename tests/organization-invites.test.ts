import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createOrganizationInviteToken,
  ORGANIZATION_INVITE_TTL_MS,
  withOrganizationSeatLock,
} from "../lib/server/organization-invites";

test("organization invite tokens are fresh 256-bit hexadecimal values", () => {
  const first = createOrganizationInviteToken();
  const second = createOrganizationInviteToken();

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.match(second, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(ORGANIZATION_INVITE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
});

test("organization seat mutations for the same organization are serialized", async () => {
  const events: string[] = [];
  let releaseFirst: () => void = () => undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = withOrganizationSeatLock("org-a", async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
  });
  await new Promise<void>((resolve) => setImmediate(resolve));

  const second = withOrganizationSeatLock("org-a", async () => {
    events.push("second:start");
    events.push("second:end");
  });
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(events, ["first:start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first:start", "first:end", "second:start", "second:end"]);
});

test("invite creation and acceptance both account for pending reservations and recheck after writes", async () => {
  const [memberRoute, acceptanceRoute] = await Promise.all([
    readFile("app/api/v1/organizations/[id]/members/route.ts", "utf8"),
    readFile("app/api/v1/organizations/invites/[token]/route.ts", "utf8"),
  ]);

  assert.match(memberRoute, /createOrganizationInviteToken\(\)/);
  assert.match(memberRoute, /includePendingInvites:\s*true/);
  assert.match(memberRoute, /getOrganizationSeatUsage\(id,\s*\{ includePendingInvites: true \}\)/);
  assert.match(acceptanceRoute, /assertCanAddOrganizationMember\(/);
  assert.match(acceptanceRoute, /includePendingInvites:\s*true/);
  assert.match(acceptanceRoute, /getOrganizationSeatUsage\(/);
  assert.match(acceptanceRoute, /excludeInviteEmail:\s*currentInvite\.email/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  audienceSchema,
  buildBroadcastRows,
  resolveAudience,
} from "../lib/admin/notifications";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

test("audienceSchema accepts all 4 valid shapes", () => {
  assert.equal(audienceSchema.safeParse({ type: "single", userId: VALID_UUID }).success, true);
  assert.equal(audienceSchema.safeParse({ type: "plan", plan: "pro" }).success, true);
  assert.equal(audienceSchema.safeParse({ type: "organization", orgId: VALID_UUID }).success, true);
  assert.equal(audienceSchema.safeParse({ type: "all" }).success, true);
});

test("audienceSchema rejects invalid shapes", () => {
  assert.equal(audienceSchema.safeParse({ type: "single", userId: "not-a-uuid" }).success, false);
  assert.equal(audienceSchema.safeParse({ type: "plan", plan: "gold" }).success, false);
  assert.equal(audienceSchema.safeParse({ type: "organization" }).success, false);
  assert.equal(audienceSchema.safeParse({ type: "unknown" }).success, false);
  assert.equal(audienceSchema.safeParse(null).success, false);
});

function fakeSupabase(table: Record<string, { data?: any[]; error?: any }>, listUsersResult?: { data?: { users: any[] }; error?: any }) {
  return {
    from(name: string) {
      const result = table[name] ?? { data: [] };
      const builder: any = {
        select() { return builder; },
        eq() { return builder; },
        maybeSingle: async () => ({ data: result.data?.[0] ?? null, error: result.error ?? null }),
        then(resolve: any) { return resolve(result); },
      };
      // Supabase query builders are thenable; emulate awaiting directly.
      return Object.assign(Promise.resolve(result), builder);
    },
    auth: {
      admin: {
        listUsers: async () => listUsersResult ?? { data: { users: [] }, error: null },
      },
    },
  } as any;
}

test("resolveAudience: single returns exactly the given user", async () => {
  const { recipients, label } = await resolveAudience(fakeSupabase({}), { type: "single", userId: VALID_UUID });
  assert.deepEqual(recipients, [{ userId: VALID_UUID }]);
  assert.equal(label, "Tek kullanıcı");
});

test("resolveAudience: plan resolves all matching user_settings rows", async () => {
  const sb = fakeSupabase({
    user_settings: { data: [{ user_id: VALID_UUID }, { user_id: VALID_UUID_2 }] },
  });
  const { recipients, label } = await resolveAudience(sb, { type: "plan", plan: "pro" });
  assert.equal(recipients.length, 2);
  assert.ok(label.includes("Pro"));
  assert.ok(label.includes("2"));
});

test("resolveAudience: plan with no matches resolves to an empty recipient list", async () => {
  const sb = fakeSupabase({ user_settings: { data: [] } });
  const { recipients } = await resolveAudience(sb, { type: "plan", plan: "enterprise" });
  assert.equal(recipients.length, 0);
});

test("resolveAudience: all resolves every listed auth user", async () => {
  const sb = fakeSupabase({}, { data: { users: [{ id: VALID_UUID }, { id: VALID_UUID_2 }] }, error: null });
  const { recipients, label } = await resolveAudience(sb, { type: "all" });
  assert.equal(recipients.length, 2);
  assert.ok(label.includes("2"));
});

test("buildBroadcastRows: produces one row per recipient sharing the same batch_id", () => {
  const rows = buildBroadcastRows(
    [{ userId: VALID_UUID }, { userId: VALID_UUID_2 }],
    "plan",
    "Pro plan · 2 kullanıcı",
    "batch-1",
    { fromUserId: "owner-1", title: "Başlık", body: "Mesaj", popupKind: "small" }
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].batch_id, "batch-1");
  assert.equal(rows[1].batch_id, "batch-1");
  assert.equal(rows[0].to_user_id, VALID_UUID);
  assert.equal(rows[1].to_user_id, VALID_UUID_2);
  assert.equal(rows[0].audience_type, "plan");
  assert.equal(rows[0].audience_label, "Pro plan · 2 kullanıcı");
  assert.equal(rows[0].from_user_id, "owner-1");
});

test("buildBroadcastRows: empty recipient list produces no rows (broadcast with 0 recipients is rejected upstream)", () => {
  const rows = buildBroadcastRows([], "all", "Tüm kullanıcılar · 0 kullanıcı", "batch-2", {
    fromUserId: "owner-1",
    title: "t",
    body: "b",
    popupKind: "big",
  });
  assert.equal(rows.length, 0);
});

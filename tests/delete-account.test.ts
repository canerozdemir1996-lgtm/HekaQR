import assert from "node:assert/strict";
import test from "node:test";
import { deleteUserAccount, type AccountDbClient } from "../lib/account/deleteAccount";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const ORG_ID = "33333333-3333-4333-8333-333333333333";

type TableData = Record<string, any[]>;

function fakeClient(opts: {
  tables: TableData;
  deleteUserError?: { message: string } | null;
  deleteCalls?: { table: string }[];
}): AccountDbClient {
  const deleteCalls = opts.deleteCalls ?? [];

  function builder(table: string, mode: "select" | "delete") {
    const rows = opts.tables[table] ?? [];
    let filtered = rows;
    let columns: string[] | null = null;
    const project = (row: any) => (columns ? Object.fromEntries(columns.map(col => [col, row[col]])) : row);
    const api: any = {
      select(cols: string) {
        columns = cols.split(",").map(c => c.trim());
        return api;
      },
      delete() {
        deleteCalls.push({ table });
        return api;
      },
      eq(col: string, val: unknown) {
        filtered = filtered.filter(row => row[col] === val);
        return api;
      },
      neq(col: string, val: unknown) {
        filtered = filtered.filter(row => row[col] !== val);
        return api;
      },
      in(col: string, vals: unknown[]) {
        filtered = filtered.filter(row => vals.includes(row[col]));
        return api;
      },
      then(resolve: any) {
        return resolve({ data: filtered.map(project), error: null });
      },
    };
    void mode;
    return api;
  }

  return {
    from(table: string) {
      return builder(table, "select");
    },
    auth: {
      admin: {
        deleteUser: async () => ({ error: opts.deleteUserError ?? null }),
      },
    },
  } as unknown as AccountDbClient;
}

test("deleteUserAccount: blocks when the owner's organization has another active member", async () => {
  const sb = fakeClient({
    tables: {
      organizations: [{ id: ORG_ID, name: "Şirket A", owner_id: OWNER_ID }],
      organization_members: [
        { org_id: ORG_ID, user_id: OWNER_ID, status: "active" },
        { org_id: ORG_ID, user_id: OTHER_MEMBER_ID, status: "active" },
      ],
      qr_codes: [],
    },
  });

  const result = await deleteUserAccount(sb, OWNER_ID);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "owns_shared_organization");
    if (result.reason === "owns_shared_organization") {
      assert.deepEqual(result.organizations, [{ id: ORG_ID, name: "Şirket A" }]);
    }
  }
});

test("deleteUserAccount: does not block when the other member is inactive (invited/rejected)", async () => {
  const sb = fakeClient({
    tables: {
      organizations: [{ id: ORG_ID, name: "Şirket A", owner_id: OWNER_ID }],
      organization_members: [
        { org_id: ORG_ID, user_id: OWNER_ID, status: "active" },
        { org_id: ORG_ID, user_id: OTHER_MEMBER_ID, status: "invited" },
      ],
      qr_codes: [],
    },
  });

  const result = await deleteUserAccount(sb, OWNER_ID);
  assert.equal(result.ok, true);
});

test("deleteUserAccount: proceeds and deletes the auth user when there is no shared organization", async () => {
  const deleteCalls: { table: string }[] = [];
  const sb = fakeClient({
    tables: {
      organizations: [{ id: ORG_ID, name: "Solo Org", owner_id: OWNER_ID }],
      organization_members: [{ org_id: ORG_ID, user_id: OWNER_ID, status: "active" }],
      qr_codes: [{ id: "qr-1", user_id: OWNER_ID }],
    },
    deleteCalls,
  });

  const result = await deleteUserAccount(sb, OWNER_ID);
  assert.equal(result.ok, true);
  assert.ok(deleteCalls.some(c => c.table === "qr_codes"));
  assert.ok(deleteCalls.some(c => c.table === "organizations"));
  assert.ok(deleteCalls.some(c => c.table === "booking_submissions"));
  assert.ok(deleteCalls.some(c => c.table === "feedback_submissions"));
});

test("deleteUserAccount: surfaces an error result instead of throwing when auth deletion fails", async () => {
  const sb = fakeClient({
    tables: { organizations: [], organization_members: [], qr_codes: [] },
    deleteUserError: { message: "auth service unavailable" },
  });

  const result = await deleteUserAccount(sb, OWNER_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "error");
});

test("deleteUserAccount: a user with no organizations at all is never blocked", async () => {
  const sb = fakeClient({
    tables: { organizations: [], organization_members: [], qr_codes: [] },
  });
  const result = await deleteUserAccount(sb, OWNER_ID);
  assert.equal(result.ok, true);
});

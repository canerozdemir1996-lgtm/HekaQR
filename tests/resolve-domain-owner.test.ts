import assert from "node:assert/strict";
import test from "node:test";
import { resolveVerifiedDomainOwnerId, type DomainLookupClient } from "../lib/domains/resolveDomainOwner";

function fakeClient(rows: Array<{ domain: string; status: string; user_id: string }>): DomainLookupClient {
  return {
    from() {
      return {
        select() {
          return {
            eq(column: string, value: string) {
              const filtered = { column, value };
              return {
                eq(column2: string, value2: string) {
                  return {
                    maybeSingle: async () => {
                      const match = rows.find(
                        row => (row as any)[filtered.column] === filtered.value && (row as any)[column2] === value2,
                      );
                      return { data: match ?? null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as DomainLookupClient;
}

test("resolveVerifiedDomainOwnerId: returns null when host is missing", async () => {
  const sb = fakeClient([]);
  assert.equal(await resolveVerifiedDomainOwnerId(null, sb), null);
  assert.equal(await resolveVerifiedDomainOwnerId(undefined, sb), null);
  assert.equal(await resolveVerifiedDomainOwnerId("", sb), null);
});

test("resolveVerifiedDomainOwnerId: returns null for the main app domain (not a registered custom domain)", async () => {
  const sb = fakeClient([{ domain: "q.musteri.com", status: "verified", user_id: "user-1" }]);
  const result = await resolveVerifiedDomainOwnerId("qr.158.220.106.172.nip.io", sb);
  assert.equal(result, null);
});

test("resolveVerifiedDomainOwnerId: returns the owner's user_id for a verified custom domain", async () => {
  const sb = fakeClient([{ domain: "q.musteri.com", status: "verified", user_id: "user-1" }]);
  const result = await resolveVerifiedDomainOwnerId("q.musteri.com", sb);
  assert.equal(result, "user-1");
});

test("resolveVerifiedDomainOwnerId: strips the port from the Host header before matching", async () => {
  const sb = fakeClient([{ domain: "q.musteri.com", status: "verified", user_id: "user-1" }]);
  const result = await resolveVerifiedDomainOwnerId("q.musteri.com:443", sb);
  assert.equal(result, "user-1");
});

test("resolveVerifiedDomainOwnerId: returns null for a domain that exists but isn't verified yet (still pending)", async () => {
  const sb = fakeClient([{ domain: "q.musteri.com", status: "pending", user_id: "user-1" }]);
  const result = await resolveVerifiedDomainOwnerId("q.musteri.com", sb);
  assert.equal(result, null);
});

test("resolveVerifiedDomainOwnerId: matching is case-insensitive on the hostname", async () => {
  const sb = fakeClient([{ domain: "q.musteri.com", status: "verified", user_id: "user-1" }]);
  const result = await resolveVerifiedDomainOwnerId("Q.MUSTERI.COM", sb);
  assert.equal(result, "user-1");
});

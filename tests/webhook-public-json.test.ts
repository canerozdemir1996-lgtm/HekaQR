import assert from "node:assert/strict";
import test from "node:test";
import { postPublicJson } from "../lib/webhooks/dispatch";

const PUBLIC_TARGET = { address: "93.184.216.34", family: 4 as const };

test("webhook redirects are re-resolved and revalidated at every hop", async () => {
  const resolved: string[] = [];
  const requested: string[] = [];
  const result = await postPublicJson("http://example.com/hook", "{}", {}, 1000, {
    resolveTarget: async url => {
      resolved.push(url.toString());
      return PUBLIC_TARGET;
    },
    request: async url => {
      requested.push(url.toString());
      return url.protocol === "http:"
        ? { status: 308, location: "https://hooks.example.com/final" }
        : { status: 204 };
    },
  });
  assert.deepEqual(resolved, ["http://example.com/hook", "https://hooks.example.com/final"]);
  assert.deepEqual(requested, resolved);
  assert.deepEqual(result, { ok: true, status: 204 });
});

test("webhook redirects reject HTTPS downgrade and unsafe ports", async () => {
  await assert.rejects(
    postPublicJson("https://example.com/hook", "{}", {}, 1000, {
      resolveTarget: async () => PUBLIC_TARGET,
      request: async () => ({ status: 302, location: "http://example.org/final" }),
    }),
    /downgrade/i,
  );
  await assert.rejects(postPublicJson("https://example.com:8443/hook", "{}"), /80 and 443|standart 80 ve 443/i);
});

test("webhook redirect count is bounded", async () => {
  await assert.rejects(
    postPublicJson("https://example.com/0", "{}", {}, 1000, {
      resolveTarget: async () => PUBLIC_TARGET,
      request: async url => ({ status: 307, location: `/${Number(url.pathname.slice(1)) + 1}` }),
    }),
    /too many/i,
  );
});

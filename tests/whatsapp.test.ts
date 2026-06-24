import assert from "node:assert/strict";
import test from "node:test";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "../lib/notifications/whatsapp";

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  return Promise.resolve(fn()).finally(() => {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test("isWhatsAppConfigured: false when either env var is missing", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: undefined, WHATSAPP_ACCESS_TOKEN: undefined }, () => {
    assert.equal(isWhatsAppConfigured(), false);
  });
  await withEnv({ WHATSAPP_PHONE_ID: "123", WHATSAPP_ACCESS_TOKEN: undefined }, () => {
    assert.equal(isWhatsAppConfigured(), false);
  });
});

test("isWhatsAppConfigured: true when both env vars are set", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: "123", WHATSAPP_ACCESS_TOKEN: "token" }, () => {
    assert.equal(isWhatsAppConfigured(), true);
  });
});

test("sendWhatsAppMessage: skips the network call entirely when not configured", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: undefined, WHATSAPP_ACCESS_TOKEN: undefined }, async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response(null, { status: 200 });
    };
    const result = await sendWhatsAppMessage("+905551112233", "merhaba", fetchFn);
    assert.deepEqual(result, { sent: false, error: "not_configured" });
    assert.equal(called, false);
  });
});

test("sendWhatsAppMessage: posts a normalized phone number and text body to the Graph API", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: "phone-id-1", WHATSAPP_ACCESS_TOKEN: "secret-token" }, async () => {
    const calls: Array<{ url: string; headers: Headers; body: string }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers as HeadersInit), body: String(init?.body) });
      return new Response(null, { status: 200 });
    };

    const result = await sendWhatsAppMessage("+90 (555) 111-22-33", "Yeni sipariş geldi", fetchFn);

    assert.deepEqual(result, { sent: true });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/phone-id-1\/messages$/);
    assert.equal(calls[0].headers.get("Authorization"), "Bearer secret-token");
    const parsed = JSON.parse(calls[0].body);
    assert.equal(parsed.to, "+905551112233");
    assert.equal(parsed.text.body, "Yeni sipariş geldi");
    assert.equal(parsed.messaging_product, "whatsapp");
  });
});

test("sendWhatsAppMessage: rejects an empty/invalid phone number without calling fetch", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: "phone-id-1", WHATSAPP_ACCESS_TOKEN: "secret-token" }, async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response(null, { status: 200 });
    };
    const result = await sendWhatsAppMessage("not a number", "merhaba", fetchFn);
    assert.equal(called, false);
    assert.equal(result.sent, false);
    assert.equal(result.error, "invalid_number");
  });
});

test("sendWhatsAppMessage: surfaces a Graph API error response instead of throwing", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: "phone-id-1", WHATSAPP_ACCESS_TOKEN: "secret-token" }, async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ error: { message: "Invalid OAuth access token" } }), { status: 401 });
    const result = await sendWhatsAppMessage("+905551112233", "merhaba", fetchFn);
    assert.equal(result.sent, false);
    assert.equal(result.error, "Invalid OAuth access token");
  });
});

test("sendWhatsAppMessage: never throws even when fetch rejects (best-effort)", async () => {
  await withEnv({ WHATSAPP_PHONE_ID: "phone-id-1", WHATSAPP_ACCESS_TOKEN: "secret-token" }, async () => {
    const fetchFn = async () => {
      throw new Error("network down");
    };
    await assert.doesNotReject(sendWhatsAppMessage("+905551112233", "merhaba", fetchFn));
  });
});

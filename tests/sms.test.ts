import assert from "node:assert/strict";
import test from "node:test";
import { isSmsConfigured, sendSms } from "../lib/notifications/sms";

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

const CLEAR_ALL = {
  TWILIO_ACCOUNT_SID: undefined, TWILIO_AUTH_TOKEN: undefined, TWILIO_FROM_NUMBER: undefined,
  NETGSM_USERCODE: undefined, NETGSM_PASSWORD: undefined, NETGSM_HEADER: undefined,
  INFOBIP_API_KEY: undefined, INFOBIP_BASE_URL: undefined, INFOBIP_SENDER: undefined,
};

test("isSmsConfigured: false when no provider env vars are set", async () => {
  await withEnv(CLEAR_ALL, () => {
    assert.equal(isSmsConfigured(), false);
  });
});

test("sendSms: returns disabled without calling fetch when unconfigured", async () => {
  await withEnv(CLEAR_ALL, async () => {
    let called = false;
    const fetchFn = (async () => { called = true; return new Response(null, { status: 200 }); }) as typeof fetch;
    const result = await sendSms({ to: "+905551112233", message: "test" }, fetchFn);
    assert.equal(called, false);
    assert.deepEqual(result, { delivered: false, provider: "disabled" });
  });
});

test("sendSms: Infobip path posts to the account base URL with App auth header", async () => {
  await withEnv({
    ...CLEAR_ALL,
    INFOBIP_API_KEY: "key-123",
    INFOBIP_BASE_URL: "abcdef.api.infobip.com",
    INFOBIP_SENDER: "447491163443",
  }, async () => {
    assert.equal(isSmsConfigured(), true);

    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ messages: [{ status: { groupName: "PENDING" } }] }), { status: 200 });
    }) as typeof fetch;

    const result = await sendSms({ to: "+905551112233", message: "merhaba" }, fetchFn);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://abcdef.api.infobip.com/sms/2/text/advanced");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "App key-123");
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.messages[0].from, "447491163443");
    assert.equal(body.messages[0].destinations[0].to, "+905551112233");
    assert.equal(body.messages[0].text, "merhaba");
    assert.deepEqual(result, { delivered: true, provider: "infobip" });
  });
});

test("sendSms: Infobip path throws with response body text on non-OK response", async () => {
  await withEnv({
    ...CLEAR_ALL,
    INFOBIP_API_KEY: "key-123",
    INFOBIP_BASE_URL: "abcdef.api.infobip.com",
    INFOBIP_SENDER: "447491163443",
  }, async () => {
    const fetchFn = (async () => new Response("insufficient funds", { status: 402 })) as typeof fetch;
    await assert.rejects(
      () => sendSms({ to: "+905551112233", message: "merhaba" }, fetchFn),
      /insufficient funds/
    );
  });
});

test("sendSms: Twilio takes priority over Infobip when both are configured", async () => {
  await withEnv({
    ...CLEAR_ALL,
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "tok",
    TWILIO_FROM_NUMBER: "+15550001111",
    INFOBIP_API_KEY: "key-123",
    INFOBIP_BASE_URL: "abcdef.api.infobip.com",
    INFOBIP_SENDER: "447491163443",
  }, async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(String(url));
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    const result = await sendSms({ to: "+905551112233", message: "merhaba" }, fetchFn);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /api\.twilio\.com/);
    assert.equal(result.provider, "twilio");
  });
});

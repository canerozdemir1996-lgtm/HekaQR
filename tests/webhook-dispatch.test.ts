import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildWebhookPayload, dispatchWebhook, signWebhookPayload } from "../lib/webhooks/dispatch";

const EVENT = {
  type: "menu_order.created" as const,
  qrId: "qr-1",
  qrSlug: "kahve-durani",
  data: { tableNo: 5, itemCount: 3, subtotal: 120 },
};

type Call = { body: string; headers: Headers };

function recordingFetch(responses: Array<{ ok: boolean; status: number } | Error>) {
  const calls: Call[] = [];
  let index = 0;
  const fetchFn = async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push({ body: String(init?.body), headers: new Headers(init?.headers as HeadersInit) });
    const outcome = responses[Math.min(index, responses.length - 1)];
    index++;
    if (outcome instanceof Error) throw outcome;
    return new Response(null, { status: outcome.status });
  };
  return { fetchFn, calls };
}

test("dispatchWebhook: returns null without calling fetch when webhook_url is empty", async () => {
  const { fetchFn, calls } = recordingFetch([{ ok: true, status: 200 }]);
  const result = await dispatchWebhook(null, EVENT, { fetchFn });
  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("dispatchWebhook: sends a correctly HMAC-signed payload that the recipient can verify", async () => {
  const secret = "shared-secret";
  const { fetchFn, calls } = recordingFetch([{ ok: true, status: 200 }]);

  const result = await dispatchWebhook("https://example.com/hook", EVENT, { secret, fetchFn });

  assert.ok(result?.delivered);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get("X-QRPublish-Event"), "menu_order.created");
  const expectedSignature = signWebhookPayload(calls[0].body, secret);
  assert.equal(calls[0].headers.get("X-QRPublish-Signature"), expectedSignature);

  const parsed = JSON.parse(calls[0].body);
  assert.equal(parsed.qr_id, "qr-1");
  assert.equal(parsed.data.tableNo, 5);
});

test("dispatchWebhook: omits the signature header when no secret is configured", async () => {
  const { fetchFn, calls } = recordingFetch([{ ok: true, status: 200 }]);
  await dispatchWebhook("https://example.com/hook", EVENT, { secret: "", fetchFn });
  assert.equal(calls[0].headers.has("X-QRPublish-Signature"), false);
});

test("dispatchWebhook: retries once on failure before giving up", async () => {
  const { fetchFn, calls } = recordingFetch([{ ok: false, status: 500 }, { ok: false, status: 500 }]);
  const result = await dispatchWebhook("https://example.com/hook", EVENT, { fetchFn, retries: 1 });
  assert.equal(calls.length, 2);
  assert.equal(result?.delivered, false);
  if (result && !result.delivered) {
    assert.equal(result.attempts, 2);
    assert.match(result.error, /500/);
  }
});

test("dispatchWebhook: succeeds on the second attempt after a transient failure", async () => {
  const { fetchFn, calls } = recordingFetch([new Error("network blip"), { ok: true, status: 200 }]);
  const result = await dispatchWebhook("https://example.com/hook", EVENT, { fetchFn, retries: 1 });
  assert.equal(calls.length, 2);
  assert.deepEqual(result, { delivered: true, attempts: 2, statusCode: 200 });
});

test("dispatchWebhook: never throws even when fetch always rejects (best-effort)", async () => {
  const { fetchFn } = recordingFetch([new Error("dns failure")]);
  await assert.doesNotReject(dispatchWebhook("https://example.com/hook", EVENT, { fetchFn, retries: 0 }));
});

test("buildWebhookPayload + signWebhookPayload: same payload and secret always produce the same signature", () => {
  const payload = buildWebhookPayload(EVENT);
  const sigA = signWebhookPayload(payload, "secret");
  const sigB = signWebhookPayload(payload, "secret");
  assert.equal(sigA, sigB);
  assert.equal(sigA, crypto.createHmac("sha256", "secret").update(payload).digest("hex"));
});

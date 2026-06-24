import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "../lib/rateLimit";

test("checkRateLimit: allows requests up to the configured max, then blocks", () => {
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit(key, 5, 60_000), true, `request ${i + 1} should be allowed`);
  }
  assert.equal(checkRateLimit(key, 5, 60_000), false);
});

test("checkRateLimit: different keys have independent counters", () => {
  const keyA = `test:a:${Math.random()}`;
  const keyB = `test:b:${Math.random()}`;
  assert.equal(checkRateLimit(keyA, 1, 60_000), true);
  assert.equal(checkRateLimit(keyA, 1, 60_000), false);
  assert.equal(checkRateLimit(keyB, 1, 60_000), true);
});

test("checkRateLimit: resets the window once it elapses", async () => {
  const key = `test:window:${Math.random()}`;
  assert.equal(checkRateLimit(key, 1, 20), true);
  assert.equal(checkRateLimit(key, 1, 20), false);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(checkRateLimit(key, 1, 20), true);
});

test("clientIp: reads the first IP from x-forwarded-for", () => {
  const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) };
  assert.equal(clientIp(req), "1.2.3.4");
});

test("clientIp: falls back to 'unknown' when header is missing", () => {
  const req = { headers: new Headers() };
  assert.equal(clientIp(req), "unknown");
});

test("tooManyRequestsResponse: returns 429 with Retry-After header", async () => {
  const res = tooManyRequestsResponse();
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
  const body = await res.json();
  assert.ok(typeof body.error === "string" && body.error.length > 0);
});

test("RATE_LIMITS: every public-write limit has a positive max and window", () => {
  for (const limit of Object.values(RATE_LIMITS)) {
    assert.ok(limit.max > 0);
    assert.ok(limit.windowMs > 0);
  }
});

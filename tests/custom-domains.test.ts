import assert from "node:assert/strict";
import test from "node:test";
import {
  generateVerificationToken,
  isValidDomainFormat,
  verificationRecordHost,
  verifyDomainTxtRecord,
} from "../lib/domains/dnsVerification";
import { provisionCustomDomainOnServer } from "../lib/domains/serverProvision";

test("isValidDomainFormat: accepts well-formed hostnames", () => {
  assert.equal(isValidDomainFormat("qr.example.com"), true);
  assert.equal(isValidDomainFormat("example.com"), true);
  assert.equal(isValidDomainFormat("sub.sub2.example.co.uk"), true);
});

test("isValidDomainFormat: rejects malformed input", () => {
  assert.equal(isValidDomainFormat(""), false);
  assert.equal(isValidDomainFormat("not a domain"), false);
  assert.equal(isValidDomainFormat("-leading-dash.com"), false);
  assert.equal(isValidDomainFormat("no-tld"), false);
  assert.equal(isValidDomainFormat("javascript:alert(1)"), false);
});

test("generateVerificationToken: produces unique, sufficiently long tokens", () => {
  const a = generateVerificationToken();
  const b = generateVerificationToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
  assert.match(a, /^[0-9a-f]+$/);
});

test("verificationRecordHost: prefixes the domain with the expected TXT record name", () => {
  assert.equal(verificationRecordHost("qr.example.com"), "_qrpublish-verify.qr.example.com");
});

test("verifyDomainTxtRecord: returns true when the TXT record contains the expected token", async () => {
  const token = "abc123";
  const resolveTxt = async (hostname: string) => {
    assert.equal(hostname, "_qrpublish-verify.qr.example.com");
    return [["abc123"]];
  };
  const result = await verifyDomainTxtRecord("qr.example.com", token, resolveTxt);
  assert.equal(result, true);
});

test("verifyDomainTxtRecord: returns false when no record matches the token", async () => {
  const resolveTxt = async () => [["some-other-value"]];
  const result = await verifyDomainTxtRecord("qr.example.com", "abc123", resolveTxt);
  assert.equal(result, false);
});

test("verifyDomainTxtRecord: returns false (not throws) when DNS lookup fails", async () => {
  const resolveTxt = async () => {
    throw new Error("ENOTFOUND");
  };
  const result = await verifyDomainTxtRecord("qr.example.com", "abc123", resolveTxt);
  assert.equal(result, false);
});

test("verifyDomainTxtRecord: joins multi-chunk TXT record parts before comparing", async () => {
  const resolveTxt = async () => [["abc", "123"]];
  const result = await verifyDomainTxtRecord("qr.example.com", "abc123", resolveTxt);
  assert.equal(result, true);
});

test("provisionCustomDomainOnServer: runs the script directly via sudo -n (not via bash) so the sudoers rule on the script path matches", async () => {
  const calls: Array<{ file: string; args: string[] }> = [];
  const execFn = async (file: string, args: string[]) => {
    calls.push({ file, args });
    return { stdout: "OK: qr.example.com provisioned", stderr: "" };
  };

  const result = await provisionCustomDomainOnServer("qr.example.com", execFn);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].file, "sudo");
  assert.equal(calls[0].args[0], "-n");
  assert.ok(calls[0].args[1].endsWith("provision-custom-domain.sh"));
  assert.equal(calls[0].args.at(-1), "qr.example.com");
});

test("provisionCustomDomainOnServer: surfaces stderr instead of throwing when the script fails (e.g. no sudo rights)", async () => {
  const execFn = async () => {
    const err = new Error("Command failed") as Error & { stderr?: string };
    err.stderr = "sudo: a password is required";
    throw err;
  };

  const result = await provisionCustomDomainOnServer("qr.example.com", execFn);
  assert.deepEqual(result, { ok: false, error: "sudo: a password is required" });
});

test("provisionCustomDomainOnServer: never throws even on an unexpected error shape", async () => {
  const execFn = async () => {
    throw "not an Error instance";
  };

  const result = await provisionCustomDomainOnServer("qr.example.com", execFn);
  assert.equal(result.ok, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { uploadMatchesMime } from "../lib/upload-validation";

test("uploadMatchesMime accepts supported file signatures", () => {
  assert.equal(uploadMatchesMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(uploadMatchesMime(Buffer.from("%PDF-1.7\n", "ascii"), "application/pdf"), true);
  assert.equal(uploadMatchesMime(Buffer.from("GIF89a", "ascii"), "image/gif"), true);
});

test("uploadMatchesMime rejects a spoofed content type", () => {
  assert.equal(uploadMatchesMime(Buffer.from("<script>alert(1)</script>"), "image/png"), false);
  assert.equal(uploadMatchesMime(Buffer.from("not a pdf"), "application/pdf"), false);
});

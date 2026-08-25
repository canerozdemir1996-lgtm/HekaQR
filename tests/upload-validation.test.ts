import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { uploadContentIsValid, uploadExtensionForMime, uploadMatchesMime, uploadRequestSizeError } from "../lib/upload-validation";

test("uploadMatchesMime accepts supported file signatures", () => {
  assert.equal(uploadMatchesMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(uploadMatchesMime(Buffer.from("%PDF-1.7\n", "ascii"), "application/pdf"), true);
  assert.equal(uploadMatchesMime(Buffer.from("GIF89a", "ascii"), "image/gif"), true);
});

test("uploadMatchesMime rejects a spoofed content type", () => {
  assert.equal(uploadMatchesMime(Buffer.from("<script>alert(1)</script>"), "image/png"), false);
  assert.equal(uploadMatchesMime(Buffer.from("not a pdf"), "application/pdf"), false);
});

test("stored upload extensions come from verified MIME, not the user filename", () => {
  assert.equal(uploadExtensionForMime("image/jpeg"), "jpg");
  assert.equal(uploadExtensionForMime("application/pdf"), "pdf");
  assert.equal(uploadExtensionForMime("text/html"), null);
});

test("AVIF compatible brands are accepted even when the major brand is mif1", () => {
  const avif = Buffer.alloc(24);
  avif.writeUInt32BE(24, 0);
  avif.write("ftyp", 4, "ascii");
  avif.write("mif1", 8, "ascii");
  avif.write("avif", 16, "ascii");
  assert.equal(uploadMatchesMime(avif, "image/avif"), true);
});

test("image uploads require a structurally decodable image", async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).png().toBuffer();
  assert.equal(await uploadContentIsValid(png, "image/png"), true);
  assert.equal(await uploadContentIsValid(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), false);
});

test("unknown-length, chunked and oversized multipart uploads fail before formData parsing", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });
  assert.equal(uploadRequestSizeError(headers({}), 100)?.status, 411);
  assert.equal(uploadRequestSizeError(headers({ "content-length": "50", "transfer-encoding": "chunked" }), 100)?.status, 411);
  assert.equal(uploadRequestSizeError(headers({ "content-length": "101" }), 100)?.status, 413);
  assert.equal(uploadRequestSizeError(headers({ "content-length": "100" }), 100), null);
});

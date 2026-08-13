import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactBodyTooLargeError,
  canonicalContactAttachmentName,
  contactAttachmentMatchesMime,
  normalizeContactAttachmentMime,
  readContactBodyWithLimit,
} from "../lib/contact-upload";

test("contact attachment names always use the verified MIME extension", () => {
  assert.equal(canonicalContactAttachmentName("payload.ps1", "text/plain"), "payload.txt");
  assert.equal(canonicalContactAttachmentName("run.bat", "text/plain"), "run.txt");
  assert.equal(canonicalContactAttachmentName("page.html", "text/plain"), "page.txt");
  assert.equal(canonicalContactAttachmentName("report.txt", "application/pdf"), "report.pdf");
  assert.equal(canonicalContactAttachmentName("..\\evil\r\nname.exe", "image/png"), ".._evil__name.png");
});

test("contact attachment MIME detection validates signatures and UTF-8 text", () => {
  assert.equal(contactAttachmentMatchesMime(Buffer.from("%PDF-1.7"), "application/pdf"), true);
  assert.equal(contactAttachmentMatchesMime(Buffer.from("not a pdf"), "application/pdf"), false);
  assert.equal(contactAttachmentMatchesMime(Buffer.from("plain UTF-8 metin", "utf8"), "text/plain"), true);
  assert.equal(contactAttachmentMatchesMime(Buffer.from([0x66, 0x00, 0x6f]), "text/plain"), false);
  assert.equal(normalizeContactAttachmentMime("TEXT/PLAIN; charset=utf-8"), "text/plain");
  assert.equal(normalizeContactAttachmentMime("text/html"), null);
});

test("contact request stream is assembled when it stays within the byte limit", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
      controller.close();
    },
  });

  assert.deepEqual(await readContactBodyWithLimit(stream, 4), new Uint8Array([1, 2, 3, 4]));
});

test("contact request stream aborts as soon as the byte ceiling is exceeded", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.enqueue(new Uint8Array([4, 5]));
      controller.close();
    },
  });

  await assert.rejects(
    readContactBodyWithLimit(stream, 4),
    (error: unknown) => error instanceof ContactBodyTooLargeError && error.maxBytes === 4,
  );
});

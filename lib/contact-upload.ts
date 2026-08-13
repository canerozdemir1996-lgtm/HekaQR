const ATTACHMENT_TYPES = {
  "image/jpeg": { extension: ".jpg" },
  "image/png": { extension: ".png" },
  "image/webp": { extension: ".webp" },
  "application/pdf": { extension: ".pdf" },
  "text/plain": { extension: ".txt" },
} as const;

export type ContactAttachmentMime = keyof typeof ATTACHMENT_TYPES;

export class ContactBodyTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`Contact request body exceeds ${maxBytes} bytes.`);
    this.name = "ContactBodyTooLargeError";
  }
}

export function normalizeContactAttachmentMime(value: string): ContactAttachmentMime | null {
  const normalized = value.trim().toLowerCase().split(";", 1)[0];
  return Object.prototype.hasOwnProperty.call(ATTACHMENT_TYPES, normalized)
    ? normalized as ContactAttachmentMime
    : null;
}

export function contactAttachmentMatchesMime(content: Buffer, contentType: ContactAttachmentMime) {
  const startsWith = (signature: number[]) => signature.every((byte, index) => content[index] === byte);
  if (contentType === "image/jpeg") return content.length >= 3 && startsWith([0xff, 0xd8, 0xff]);
  if (contentType === "image/png") return content.length >= 8 && startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (contentType === "image/webp") {
    return content.length >= 12
      && content.subarray(0, 4).toString("ascii") === "RIFF"
      && content.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (contentType === "application/pdf") {
    return content.length >= 5 && content.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (content.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(content);
    return true;
  } catch {
    return false;
  }
}

export function canonicalContactAttachmentName(value: string, contentType: ContactAttachmentMime) {
  const extension = ATTACHMENT_TYPES[contentType].extension;
  const sanitized = value
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .trim()
    .replace(/[. ]+$/g, "");
  const lastDot = sanitized.lastIndexOf(".");
  const basename = (lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized)
    .replace(/[. ]+$/g, "")
    .slice(0, 120 - extension.length);
  return `${basename || "ek-dosya"}${extension}`;
}

export async function readContactBodyWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("maxBytes must be a non-negative safe integer.");
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ContactBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

const SIGNATURES: Record<string, (content: Buffer) => boolean> = {
  "image/jpeg": (content) => content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
  "image/png": (content) => content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (content) => content.length >= 12
    && content.subarray(0, 4).toString("ascii") === "RIFF"
    && content.subarray(8, 12).toString("ascii") === "WEBP",
  "image/gif": (content) => content.length >= 6 && ["GIF87a", "GIF89a"].includes(content.subarray(0, 6).toString("ascii")),
  "image/avif": (content) => {
    if (content.length < 16 || content.subarray(4, 8).toString("ascii") !== "ftyp") return false;
    const boxSize = Math.min(content.readUInt32BE(0), content.length, 4096);
    if (boxSize < 16) return false;
    for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
      if (["avif", "avis"].includes(content.subarray(offset, offset + 4).toString("ascii"))) return true;
    }
    return false;
  },
  "application/pdf": (content) => content.length >= 5 && content.subarray(0, 5).toString("ascii") === "%PDF-",
};

export function uploadMatchesMime(content: Buffer, contentType: string) {
  return SIGNATURES[contentType]?.(content) ?? false;
}

export function uploadExtensionForMime(contentType: string) {
  return ({
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "application/pdf": "pdf",
  } as Record<string, string>)[contentType] ?? null;
}

export function uploadRequestSizeError(headers: Pick<Headers, "get">, maxBytes: number) {
  const rawLength = headers.get("content-length");
  const transferEncoding = headers.get("transfer-encoding") ?? "";
  if (!rawLength || /chunked/i.test(transferEncoding)) {
    return { status: 411, error: "Dosya yükleme isteği için Content-Length zorunludur." };
  }
  const contentLength = Number(rawLength);
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    return { status: 400, error: "Geçersiz Content-Length." };
  }
  if (contentLength > maxBytes) {
    return { status: 413, error: "İstek boyutu 15 MB sınırını aşıyor." };
  }
  return null;
}

export async function uploadContentIsValid(content: Buffer, contentType: string) {
  if (!uploadMatchesMime(content, contentType)) return false;
  if (!contentType.startsWith("image/")) return true;
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(content, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
    const expected = contentType === "image/avif" ? "heif" : contentType.replace("image/", "");
    return metadata.width != null && metadata.height != null && metadata.format === expected;
  } catch {
    return false;
  }
}

const SIGNATURES: Record<string, (content: Buffer) => boolean> = {
  "image/jpeg": (content) => content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
  "image/png": (content) => content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (content) => content.length >= 12
    && content.subarray(0, 4).toString("ascii") === "RIFF"
    && content.subarray(8, 12).toString("ascii") === "WEBP",
  "image/gif": (content) => content.length >= 6 && ["GIF87a", "GIF89a"].includes(content.subarray(0, 6).toString("ascii")),
  "image/avif": (content) => content.length >= 12
    && content.subarray(4, 8).toString("ascii") === "ftyp"
    && ["avif", "avis"].includes(content.subarray(8, 12).toString("ascii")),
  "application/pdf": (content) => content.length >= 5 && content.subarray(0, 5).toString("ascii") === "%PDF-",
};

export function uploadMatchesMime(content: Buffer, contentType: string) {
  return SIGNATURES[contentType]?.(content) ?? false;
}

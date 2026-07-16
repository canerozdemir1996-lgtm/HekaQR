import crypto from "crypto";

function payload(batchId: string, rowNumber: number, userId: string) {
  return `${batchId}:${rowNumber}:${userId}`;
}

export function createImportDispatchToken(batchId: string, rowNumber: number, userId: string, secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") {
  if (!secret) throw new Error("Import dispatch secret is not configured.");
  return crypto.createHmac("sha256", secret).update(payload(batchId, rowNumber, userId)).digest("hex");
}

export function verifyImportDispatchToken(token: string | null, batchId: string | null, rowNumber: string | null, userId: string, secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") {
  if (!token || !batchId || !rowNumber || !secret || !/^\d+$/.test(rowNumber)) return false;
  const expected = createImportDispatchToken(batchId, Number(rowNumber), userId, secret);
  const suppliedBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

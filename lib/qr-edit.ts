export function usesEditableUrlField(qrType: string) {
  return qrType === "url" || qrType === "product";
}

export function readStoredQrDesign(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.keys(value).length > 0 ? value as Record<string, unknown> : null;
}

export function staticQrTargetChanged(
  requestedTarget: string | undefined,
  existingStaticPayload: string | null | undefined,
  existingTargetUrl: string | null | undefined,
) {
  if (requestedTarget === undefined) return false;
  const existingTarget = existingStaticPayload ?? existingTargetUrl;
  return comparableStaticTarget(requestedTarget) !== comparableStaticTarget(existingTarget);
}

function comparableStaticTarget(value: string | null | undefined) {
  const raw = String(value ?? "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return raw;
    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    url.pathname = url.pathname.replace(/%([0-9a-f]{2})/gi, (match, hex: string) => {
      const char = String.fromCharCode(Number.parseInt(hex, 16));
      return /[A-Za-z0-9._~-]/.test(char) ? char : match.toUpperCase();
    });
    return url.toString();
  } catch {
    return raw;
  }
}

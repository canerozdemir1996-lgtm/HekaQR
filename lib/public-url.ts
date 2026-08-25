export function safePublicHttpUrl(value: unknown): string {
  try {
    const parsed = new URL(String(value ?? "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function safeQrRedirectUrl(value: unknown): URL | null {
  const safe = safePublicHttpUrl(value);
  return safe ? new URL(safe) : null;
}

export function safeAppStoreUrl(value: unknown): string {
  try {
    const parsed = new URL(String(value ?? "").trim());
    return ["http:", "https:", "itms-apps:", "market:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

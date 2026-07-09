const DEFAULT_PUBLIC_ORIGIN = "https://qrpublish.com";

function normalizeOrigin(value?: string | null) {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1";

    return isLocal ? "" : url.origin;
  } catch {
    return "";
  }
}

export function getPublicAppOrigin(fallbackOrigin?: string | null) {
  return (
    normalizeOrigin(typeof window === "undefined" ? process.env.APP_URL : undefined) ||
    normalizeOrigin(typeof window === "undefined" ? process.env.PUBLIC_APP_URL : undefined) ||
    normalizeOrigin(typeof window === "undefined" ? process.env.APP_BASE_URL : undefined) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(typeof window === "undefined" ? process.env.SITE_URL : undefined) ||
    normalizeOrigin(typeof window === "undefined" ? process.env.PUBLIC_URL : undefined) ||
    normalizeOrigin(typeof window === "undefined" ? process.env.AUTH_URL : undefined) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(fallbackOrigin) ||
    DEFAULT_PUBLIC_ORIGIN
  );
}

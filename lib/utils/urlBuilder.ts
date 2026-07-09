import { getPublicAppOrigin } from "@/lib/publicOrigin";

/**
 * Append UTM parameters to a URL.
 */
export function appendUtmParams(
  baseUrl: string,
  utmParams: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    term?: string | null;
    content?: string | null;
  }
): string {
  try {
    const url = new URL(baseUrl);

    const params = [
      ["utm_source", utmParams.source],
      ["utm_medium", utmParams.medium],
      ["utm_campaign", utmParams.campaign],
      ["utm_term", utmParams.term],
      ["utm_content", utmParams.content],
    ] as const;

    for (const [key, value] of params) {
      if (value) url.searchParams.set(key, value);
    }

    return url.toString();
  } catch (e) {
    console.error("Error appending UTM params:", e);
    return baseUrl;
  }
}

/**
 * Build a QR code render URL.
 */
export function buildQrRenderUrl(
  slug: string,
  format: "png" | "svg" = "png",
  size: number = 600,
  origin: string = ""
): string {
  const baseOrigin = getPublicAppOrigin(origin || (typeof window !== "undefined" ? window.location.origin : ""));
  return `${baseOrigin}/api/v1/qrcodes/render?slug=${encodeURIComponent(slug)}&format=${format}&size=${Math.max(128, Math.min(2048, size))}`;
}

/**
 * Build an authenticated API URL for downloading a QR code PNG by id.
 */
export function buildApiQrPngUrl(
  id: string,
  size: number = 720,
  origin: string = "",
  version?: string | null
): string {
  const baseOrigin = getPublicAppOrigin(origin || (typeof window !== "undefined" ? window.location.origin : ""));
  const url = new URL(`/api/v1/qrcodes/${encodeURIComponent(id)}/png`, baseOrigin);
  url.searchParams.set("size", String(Math.max(128, Math.min(2048, size))));
  if (version) url.searchParams.set("v", version);
  return url.toString();
}

/**
 * Build a short link URL.
 */
export function buildShortLinkUrl(slug: string, origin: string = ""): string {
  const baseOrigin = getPublicAppOrigin(origin || (typeof window !== "undefined" ? window.location.origin : ""));
  return `${baseOrigin}/q/${encodeURIComponent(slug)}`;
}

/**
 * Build a vCard page URL.
 */
export function buildVCardUrl(slug: string, origin: string = ""): string {
  const baseOrigin = getPublicAppOrigin(origin || (typeof window !== "undefined" ? window.location.origin : ""));
  return `${baseOrigin}/card/${encodeURIComponent(slug)}`;
}

/**
 * Parse a URL and return its hostname.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Test if a URL is valid.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Match URL patterns for A/B testing.
 */
export function shouldUseAbTestUrl(
  baseUrl: string,
  abTestUrl: string | null | undefined,
  weight: number = 0.5
): string {
  if (!abTestUrl) return baseUrl;
  return Math.random() < weight ? abTestUrl : baseUrl;
}

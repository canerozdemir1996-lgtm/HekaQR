const FALLBACK_PATH = "/dashboard";
const INTERNAL_ORIGIN = "https://qrpublish.local";

/**
 * Accept only same-origin relative application paths. This helper is shared by
 * middleware, credential login, OAuth and signup so every auth entry point
 * applies the same redirect rules.
 */
export function safeInternalPath(value?: string | null, fallback = FALLBACK_PATH) {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\") || /[\u0000-\u001F\u007F]/.test(candidate)) return fallback;

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withNextParam(path: string, next?: string | null) {
  const safeNext = safeInternalPath(next);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(safeNext)}`;
}

export type PublicLocale = "tr" | "en";

export const PUBLIC_LOCALE_COOKIE = "qrpublish_public_locale_v1";

export function resolvePublicLocale(
  value?: string | string[] | null,
  persistedValue?: string | null,
): PublicLocale {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "tr" || normalized === "en") return normalized;
  return persistedValue === "en" ? "en" : "tr";
}

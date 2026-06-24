export type PublicLocale = "tr" | "en";

export function resolvePublicLocale(value?: string | string[] | null): PublicLocale {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "en" ? "en" : "tr";
}

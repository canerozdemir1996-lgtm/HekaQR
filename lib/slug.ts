export type NormalizeSlugOptions = {
  allowUnderscore?: boolean;
  fallback?: string;
  maxLength?: number;
};

export function normalizeSlug(value: string, options: NormalizeSlugOptions = {}) {
  const allowUnderscore = options.allowUnderscore ?? false;
  const maxLength = options.maxLength ?? 80;
  const fallback = options.fallback ?? "";
  const invalidChars = allowUnderscore ? /[^a-z0-9_-]+/g : /[^a-z0-9]+/g;

  const normalized = value
    .trim()
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Şş]/g, "s")
    .replace(/[İIı]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(invalidChars, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, maxLength)
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || fallback;
}

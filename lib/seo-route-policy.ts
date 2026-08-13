export const SEO_NOINDEX_EXACT_ROUTES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/inactive",
  "/status",
] as const;

export const SEO_NOINDEX_PREFIXES = [
  "/dashboard",
  "/admin",
  "/api",
  "/auth",
  "/pricing/checkout",
  "/print",
  "/dev-tools",
  "/__e2e",
  "/q",
  "/01",
  "/audio",
  "/appstore",
  "/booking",
  "/card",
  "/coupon",
  "/doc",
  "/exam",
  "/feedback",
  "/links",
  "/menu",
  "/product",
  "/protected",
  "/temiz",
  "/text",
  "/wifi",
] as const;

export function isSeoNoIndexPath(pathname: string) {
  const clean = pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  if ((SEO_NOINDEX_EXACT_ROUTES as readonly string[]).includes(clean)) return true;
  return SEO_NOINDEX_PREFIXES.some(prefix => clean === prefix || clean.startsWith(`${prefix}/`));
}

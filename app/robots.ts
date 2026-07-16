import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { SEO_NOINDEX_EXACT_ROUTES, SEO_NOINDEX_PREFIXES } from "@/lib/seo-route-policy";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...SEO_NOINDEX_EXACT_ROUTES,
        ...SEO_NOINDEX_PREFIXES.flatMap(prefix => [prefix, `${prefix}/*`]),
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

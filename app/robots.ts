import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/dashboard/*",
        "/admin",
        "/admin/*",
        "/api/*",
        "/login",
        "/auth/*",
        "/pricing/checkout",
        "/print/*",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

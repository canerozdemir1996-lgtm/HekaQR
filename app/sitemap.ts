import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicAppOrigin();
  const now = new Date();

  return [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${origin}/pricing/enterprise`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}

import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import { seoUseCasePages } from "@/lib/seo-use-case-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicAppOrigin();
  // Update this date only when a listed static page materially changes.
  const lastModified = new Date("2026-07-10T00:00:00.000Z");

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${origin}/pricing/enterprise`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/developers`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/chrome-extension`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/cookie-policy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  const landingPages: MetadataRoute.Sitemap = Object.values(seoLandingPages).map((page) => ({
    url: `${origin}/${page.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const useCasePages: MetadataRoute.Sitemap = Object.values(seoUseCasePages).map((page) => ({
    url: `${origin}/kullanim-alanlari/${page.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...landingPages, ...useCasePages];
}

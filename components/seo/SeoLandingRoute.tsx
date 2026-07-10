import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import { buildPageMetadata } from "@/lib/seo";

export function getSeoLandingMetadata(slug: string) {
  const page = seoLandingPages[slug];
  return buildPageMetadata({ title: page.title, description: page.description, path: `/${page.slug}` });
}

export function SeoLandingRoute({ slug }: { slug: string }) {
  const page = seoLandingPages[slug];
  const relatedPages = page.relatedSlugs.map((relatedSlug) => seoLandingPages[relatedSlug]).filter(Boolean);
  return <SeoLandingPage page={page} relatedPages={relatedPages} />;
}

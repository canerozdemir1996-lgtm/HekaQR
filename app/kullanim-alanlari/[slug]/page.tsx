import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import { seoUseCasePages } from "@/lib/seo-use-case-pages";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return Object.keys(seoUseCasePages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = seoUseCasePages[slug];
  if (!page) return {};
  return buildPageMetadata({ title: page.title, description: page.description, path: `/kullanim-alanlari/${page.slug}` });
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = seoUseCasePages[slug];
  if (!page) notFound();
  const relatedPages = page.relatedSlugs.map((relatedSlug) => seoLandingPages[relatedSlug]).filter(Boolean);
  return <SeoLandingPage page={page} relatedPages={relatedPages} path={`/kullanim-alanlari/${page.slug}`} />;
}

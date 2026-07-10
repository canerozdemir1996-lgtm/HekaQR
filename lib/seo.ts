import type { Metadata } from "next";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

const SITE_NAME = "QR Publish";
const DEFAULT_OG_IMAGE = "/opengraph-image";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  locale?: "tr_TR" | "en_US";
  alternateLanguages?: Record<string, string>;
};

function normalizePath(path: string) {
  return path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export function getCanonicalUrl(path = "/") {
  return new URL(normalizePath(path), getPublicAppOrigin()).toString();
}

/** Build page-specific metadata so public routes never inherit another route's canonical URL. */
export function buildPageMetadata({
  title,
  description,
  path,
  locale = "tr_TR",
  alternateLanguages,
}: PageMetadataOptions): Metadata {
  const canonical = getCanonicalUrl(path);
  const languageAlternates = alternateLanguages
    ? Object.fromEntries(
        Object.entries(alternateLanguages).map(([language, alternatePath]) => [
          language,
          getCanonicalUrl(alternatePath),
        ]),
      )
    : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      ...(languageAlternates ? { languages: languageAlternates } : {}),
    },
    openGraph: {
      type: "website",
      locale,
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
      creator: "@qrpublish",
    },
  };
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

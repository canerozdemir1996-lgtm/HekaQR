"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import brandLogo from "@/Logo.webp";
import { cn } from "@/lib/utils";

type LogoRendererProps = {
  src?: string | StaticImageData | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  frame?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  fallback?: "brand" | "none";
};

const sizeClass: Record<NonNullable<LogoRendererProps["size"]>, string> = {
  xs: "h-8 w-24",
  sm: "h-10 w-32",
  md: "h-12 w-40",
  lg: "h-16 w-52",
};

function isStaticImageData(value: LogoRendererProps["src"]): value is StaticImageData {
  return Boolean(value && typeof value === "object" && "src" in value);
}

function isRenderableImageUrl(value: unknown) {
  const clean = String(value ?? "").trim();
  return clean.startsWith("/") || clean.startsWith("data:image/") || /^https?:\/\/.+/i.test(clean);
}

export default function LogoRenderer({
  src,
  alt = "QR Publish",
  className,
  imageClassName,
  priority = false,
  frame = false,
  size = "md",
  fallback = "brand",
}: LogoRendererProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = !failed && (isStaticImageData(src) || isRenderableImageUrl(src)) ? src : fallback === "brand" ? brandLogo : null;

  return (
    <span
      className={cn(
        "logo-renderer relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        sizeClass[size],
        frame && "rounded-2xl bg-white/90 p-2 ring-1 ring-slate-200/80 dark:bg-white/10 dark:ring-white/10",
        className,
      )}
    >
      {isStaticImageData(resolvedSrc) ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 160px, 220px"
          className={cn("object-contain object-center", imageClassName)}
        />
      ) : resolvedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(resolvedSrc)}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-contain object-center", imageClassName)}
        />
      ) : null}
    </span>
  );
}

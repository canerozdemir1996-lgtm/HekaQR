"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type MenuImageVariant =
  | "cover"
  | "logo"
  | "category-chip"
  | "category-card"
  | "category-icon"
  | "product-side"
  | "product-wide"
  | "product-round"
  | "upload-preview";

type MenuImageProps = {
  src?: string | null;
  alt?: string;
  variant?: MenuImageVariant;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
};

const variantClass: Record<MenuImageVariant, string> = {
  cover: "h-full w-full rounded-none",
  logo: "h-16 w-16 rounded-2xl border border-white/40 bg-white shadow-xl",
  "category-chip": "h-12 w-12 rounded-full bg-slate-200 ring-1 ring-current/10",
  "category-card": "aspect-square w-full bg-slate-200",
  "category-icon": "h-14 w-14 rounded-xl bg-slate-200",
  "product-side": "h-28 w-28 bg-slate-200",
  "product-wide": "aspect-[16/10] w-full bg-slate-200",
  "product-round": "h-28 w-28 rounded-full bg-slate-200",
  "upload-preview": "h-full w-full bg-slate-100",
};

const variantSizes: Record<MenuImageVariant, string> = {
  cover: "100vw",
  logo: "112px",
  "category-chip": "48px",
  "category-card": "(max-width: 768px) 42vw, 160px",
  "category-icon": "56px",
  "product-side": "112px",
  "product-wide": "(max-width: 768px) 100vw, 520px",
  "product-round": "112px",
  "upload-preview": "(max-width: 768px) 100vw, 480px",
};

function canUseNextImage(src: string) {
  return src.startsWith("/") || src.startsWith("https://");
}

export function MenuImage({
  src,
  alt = "",
  variant = "upload-preview",
  className,
  imageClassName,
  sizes,
  priority = false,
  style,
}: MenuImageProps) {
  const [failed, setFailed] = useState(false);
  const source = src?.trim();
  const showImage = Boolean(source && !failed);
  const imgClass = cn("object-cover object-center", imageClassName);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden text-slate-400 dark:text-slate-500",
        variantClass[variant],
        className,
      )}
      style={style}
    >
      {showImage ? (
        canUseNextImage(source!) ? (
          <Image
            src={source!}
            alt={alt}
            fill
            sizes={sizes ?? variantSizes[variant]}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className={imgClass}
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={source}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cn("h-full w-full", imgClass)}
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <ImageIcon className="h-5 w-5 opacity-60" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

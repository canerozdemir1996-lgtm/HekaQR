"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

export default function BrandLogo({
  className,
  priority = false,
  width = 220,
  height = 72,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/qr-publish-logo.png"
      alt="QR Publish"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto max-w-full", className)}
    />
  );
}

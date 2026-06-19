"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import logoImage from "@/Logo.webp";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

export default function BrandLogo({
  className,
  priority = false,
  width: _width = logoImage.width,
  height: _height = logoImage.height,
}: BrandLogoProps) {
  return (
    <Image
      src={logoImage}
      alt="QR Publish"
      priority={priority}
      className={cn("h-auto w-auto max-w-full", className)}
      sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 320px"
    />
  );
}

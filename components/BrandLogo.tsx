"use client";

import LogoRenderer from "@/components/LogoRenderer";
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
  return <LogoRenderer src={logoImage} alt="QR Publish" priority={priority} className={className} size="lg" />;
}

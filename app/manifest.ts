import type { MetadataRoute } from "next";
import { BRAND_ASSET_VERSION } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QR Publish",
    short_name: "QR Publish",
    description: "Dinamik QR yayın, menü, rezervasyon, geri bildirim ve analitik platformu.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#7c3aed",
    icons: [
      { src: `/icons/icon-192.png?v=${BRAND_ASSET_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/icon-512.png?v=${BRAND_ASSET_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/icon-maskable-192.png?v=${BRAND_ASSET_VERSION}`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icons/icon-maskable-512.png?v=${BRAND_ASSET_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

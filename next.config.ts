import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Büyük base64 logo verileri için body limit artır
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/qrcodes/render/:slug.:format',
        destination: '/api/v1/qrcodes/render?slug=:slug&format=:format',
      },
    ];
  },
};

module.exports = nextConfig;

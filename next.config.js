/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false,
  },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            // Report-Only: ihlalleri tarayıcı konsoluna loglar ama hiçbir kaynağı engellemez.
            // GA4/GTM (kullanıcı bazlı enjekte edilir) ve serbest görsel host'ları yüzünden
            // doğrudan enforce etmeden önce staging'de gözlemlenmeli.
            key: "Content-Security-Policy-Report-Only",
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; frame-src https://www.google.com; connect-src 'self' https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

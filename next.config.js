/** @type {import('next').NextConfig} */
const nextConfig = {
  // auto-deploy.sh build'i ayrı bir distDir'e alıp atomik mv ile takas eder —
  // bu sayede çalışan `next start` build sürerken yarım/değişen dosya okumaz
  // (zero-downtime deploy). Çalışan process her zaman varsayılan ".next"i kullanır.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: {
    buildActivity: false,
  },
  // instrumentation.ts (Sentry server/edge init + onRequestError) Next 14'te
  // bu flag olmadan hiç çalıştırılmaz.
  experimental: {
    instrumentationHook: true,
    // geoip-lite, data dosyalarını kendi dizininden okur — webpack bundle'a
    // dahil edilemez, server tarafında native require olarak bırakılmalı.
    serverComponentsExternalPackages: ["geoip-lite"],
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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.qrpublish.com" }],
        destination: "https://qrpublish.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/signup",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/register",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/forgot-password",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/inactive",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/pricing/checkout/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/print/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/status",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            // Report-Only: ihlalleri tarayıcı konsoluna loglar ama hiçbir kaynağı engellemez.
            // GA4/GTM (kullanıcı bazlı enjekte edilir) ve serbest görsel host'ları yüzünden
            // doğrudan enforce etmeden önce staging'de gözlemlenmeli.
            key: "Content-Security-Policy-Report-Only",
            // frame-src: Lemon Squeezy checkout overlay iframe'i. `store.qrpublish.com`
            // LS custom store domainidir; `'self'` subdomain'i kapsamadigi icin acikca
            // eklenir. `*.lemonsqueezy.com` overlay/hosted checkout fallback'i icin.
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; frame-src https://www.google.com https://*.lemonsqueezy.com https://store.qrpublish.com; connect-src 'self' https:;",
          },
        ],
      },
    ];
  },
};

// Sentry yalnızca SENTRY_DSN ayarlıyken devreye girer — yoksa next.config.js
// tamamen Sentry'siz haliyle çalışır (ek webpack plugin'i, sourcemap upload
// denemesi vb. yok), eksik env değişkeni build/runtime'ı kıramaz.
if (process.env.SENTRY_DSN) {
  const { withSentryConfig } = require("@sentry/nextjs");
  module.exports = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
  });
} else {
  module.exports = nextConfig;
}

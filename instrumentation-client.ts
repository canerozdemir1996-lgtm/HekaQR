import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry initialization must live in this Next.js 16 file
// convention so Turbopack can include it in the client bundle.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

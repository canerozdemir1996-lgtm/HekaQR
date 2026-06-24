import * as Sentry from "@sentry/nextjs";

// Client tarafında DSN, env'den NEXT_PUBLIC_ prefix'iyle gelmek zorunda
// (Next.js sadece NEXT_PUBLIC_* değişkenlerini browser bundle'ına gömer).
// Bu dosya withSentryConfig() tarafından otomatik bulunup client bundle'a
// enjekte edilir (bkz. next.config.js) — Next.js 14'te "instrumentation-client.ts"
// henüz desteklenmediği için klasik sentry.client.config.ts kullanılıyor.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

import * as Sentry from "@sentry/nextjs";

// SENTRY_DSN ayarlı değilse Sentry.init() hiç çağrılmaz — SDK'nın diğer
// fonksiyonları (captureException vb.) bu durumda sessizce no-op çalışır,
// bu yüzden Sentry yapılandırılmamış ortamlarda hiçbir şeyi bozmaz.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

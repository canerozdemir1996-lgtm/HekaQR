export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next.js'in App Router'da yakaladığı (ama otomatik instrumentation'ın
// göremediği) server/edge hatalarını Sentry'ye iletir. SENTRY_DSN yoksa
// Sentry.init() hiç çağrılmadığı için captureRequestError sessizce no-op'tur.
export const onRequestError = async (
  ...args: Parameters<(typeof import("@sentry/nextjs"))["captureRequestError"]>
) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};

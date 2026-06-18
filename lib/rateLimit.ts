// In-memory sliding-window rate limiter.
//
// pm2 bu uygulamayı fork modunda TEK instance olarak çalıştırıyor (cluster değil),
// bu yüzden process-local Map state yeterli — ek bir Redis/Upstash hesabı gerekmez.
// Not: pm2 cluster mode'a veya çoklu instance'a geçilirse bu limiter instance'lar
// arasında state paylaşmaz; o noktada @upstash/ratelimit + Upstash Redis'e geçin.

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= max;
}

// Periyodik temizlik — süresi geçmiş kayıtların Map'te birikip belleği şişirmesini önler.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export const RATE_LIMITS = {
  // Auth: brute-force login denemelerine karşı
  AUTH: { max: 10, windowMs: 60_000 },
  // QR oluşturma: spam/kötüye kullanıma karşı
  QR_CREATE: { max: 20, windowMs: 60_000 },
  // Menü sipariş: kimlik doğrulamasız uç, sipariş spam'ine karşı
  MENU_ORDER: { max: 10, windowMs: 60_000 },
} as const;

export function tooManyRequestsResponse() {
  return new Response(
    JSON.stringify({ error: "Çok fazla istek, lütfen biraz sonra tekrar deneyin." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
  );
}

import { getClientIp } from "@/lib/request-ip";

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
// unref(): bu timer process'in canlı kalması için bir sebep oluşturmasın —
// aksi halde test çalıştırıcıları (tsx --test) ve kısa ömürlü script'ler
// hiçbir zaman çıkış yapamaz, çünkü Node event loop'u bu interval yüzünden açık tutar.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

export const RATE_LIMITS = {
  // Auth: brute-force login denemelerine karşı (e-posta bazlı)
  AUTH: { max: 10, windowMs: 60_000 },
  // Auth: aynı IP'den çok sayıda farklı hesaba deneme yapılmasına karşı
  AUTH_IP: { max: 20, windowMs: 60_000 },
  // QR oluşturma: spam/kötüye kullanıma karşı
  QR_CREATE: { max: 20, windowMs: 60_000 },
  // Menü sipariş: kimlik doğrulamasız uç, sipariş spam'ine karşı
  MENU_ORDER: { max: 10, windowMs: 60_000 },
  // Rezervasyon formu: kimlik doğrulamasız uç, spam'e karşı
  BOOKING_SUBMIT: { max: 10, windowMs: 60_000 },
  // Geri bildirim formu: kimlik doğrulamasız uç, spam'e karşı
  FEEDBACK_SUBMIT: { max: 10, windowMs: 60_000 },
  // vCard lead collection formu: kimlik doğrulamasız uç, spam'e karşı
  LEAD_SUBMIT: { max: 10, windowMs: 60_000 },
  // Public contact form: low limit to prevent outbound email abuse.
  CONTACT: { max: 5, windowMs: 10 * 60_000 },
  // Anlık QR render (Chrome eklentisi, anasayfa hızlı oluşturucu): kimlik doğrulamasız, IP bazlı
  INSTANT_QR: { max: 30, windowMs: 60_000 },
  // Authenticated SEO fetcher: outbound request abuse and public port scanning pressure.
  SEO_AUDIT: { max: 10, windowMs: 10 * 60_000 },
  // QR tarama/yönlendirme: gerçek kullanım yüksek hacimli olabilir,
  // bu yüzden limit yüksek tutulup yalnızca bariz kötüye kullanım (script/bot) hedeflenir.
  QR_SCAN: { max: 120, windowMs: 60_000 },
  // Şifreli QR unlock denemesi: brute-force tespiti için sıkı limit.
  // 5 başarısız deneme 5 dakika içinde → kilitlenir.
  QR_UNLOCK: { max: 5, windowMs: 5 * 60_000 },
} as const;

export function tooManyRequestsResponse() {
  return new Response(
    JSON.stringify({ error: "Çok fazla istek, lütfen biraz sonra tekrar deneyin." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
  );
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return getClientIp(req);
}

export const dynamic = "force-dynamic";

const body = `
const CACHE = "qrpublish-static-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/pricing",
        "/privacy",
        "/terms",
        "/cookie-policy",
        "/Icon.webp",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    /\\.(?:css|js|woff2?|ttf|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML sayfalar (navigasyon) her zaman ağdan — eski build asla serve edilmez.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((c) => c || caches.match("/"))),
    );
    return;
  }

  // İçerik-hash'li static asset'ler cache-first (güvenli, immutable).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const next = response.clone();
            caches.open(CACHE).then((cache) => cache.put(req, next));
          }
          return response;
        });
      }),
    );
    return;
  }

  // API ve diğer dinamik istekler: cache'lenmez, doğrudan ağ.
});
`;

export async function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

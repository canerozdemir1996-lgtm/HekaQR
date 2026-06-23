export const dynamic = "force-dynamic";

const body = `
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("qrpublish-static-v1").then((cache) =>
      cache.addAll([
        "/",
        "/pricing",
        "/privacy-policy",
        "/terms",
        "/cookie-policy",
        "/Icon.webp",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const next = response.clone();
        caches.open("qrpublish-static-v1").then((cache) => cache.put(event.request, next));
        return response;
      });
    }),
  );
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

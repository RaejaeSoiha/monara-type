/* ============================================================
   SW.JS — Monara Type offline service worker
   Strategy:
     - App shell (HTML/CSS/JS/manifest) precached at install.
     - data-mon.js (~1.5 MB) is NOT precached — it's runtime-cached
       the first time the user selects Mon, keeping install fast.
     - Same-origin fetches: cache-first with network fallback.
     - Cross-origin (Google Fonts): stale-while-revalidate.
   Bump CACHE_NAME to force a refresh of all cached assets.
============================================================ */
const CACHE_NAME = "monara-type-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./css/style.css",
  "./css/themes.css",
  "./js/data-en.js",
  "./js/data-mm.js",
  "./js/data.js",
  "./js/storage.js",
  "./js/audio.js",
  "./js/practice.js",
  "./js/race.js",
  "./js/stats.js",
  "./js/app.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin: cache-first, fall back to network, save to cache.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Cross-origin (fonts, etc.): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      });
      return hit || net;
    })
  );
});

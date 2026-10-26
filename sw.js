// Keeps the Race Book working with no signal at the track.
// Bump VERSION whenever app files change so phones pick up the new copy.
const VERSION = "race-book-v3";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(APP_FILES);
    // The Excel tool is optional: if it can't be fetched now, it is cached on first use
    try { await cache.add(XLSX_URL); } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The page itself: get the latest copy when there's signal, so an update shows
// on the very next open. With no signal (or a very slow one), use the saved copy.
async function latestPage(req) {
  const cache = await caches.open(VERSION);
  const network = fetch(req).then(res => {
    if (res && res.ok) cache.put("./index.html", res.clone());
    return res;
  });
  network.catch(() => {});
  const slow = new Promise(resolve => setTimeout(resolve, 4000));
  try {
    const res = await Promise.race([network, slow]);
    if (res && res.ok) return res;
  } catch (err) {}
  const cached = await cache.match("./index.html");
  return cached || network;
}

// Everything else: serve from the cache right away, refresh it in the background
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === location.origin) {
    event.respondWith(latestPage(req));
    return;
  }
  const cacheable = url.origin === location.origin || url.href === XLSX_URL ||
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!cacheable) return;

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(fresh); return cached; }
    return (await fresh) || (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
  })());
});

// Offline support. The build fills in VERSION and PRECACHE; a new build
// means a new cache, and the old one is dropped on activate.
const VERSION = "%VERSION%";
const PRECACHE = %PRECACHE%;
const CACHE = `oot-${VERSION}`;
const NEVER = /^\/(api|auth|healthz)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", ...PRECACHE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("oot-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || NEVER.test(url.pathname)) return;

  // Pages: network first so a deploy shows up at once; the cached shell
  // keeps the checklist working offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === "/") caches.open(CACHE).then((c) => c.put("/", res.clone()));
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error())),
    );
    return;
  }

  // Hashed assets, fonts and icons never change under the same URL.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.startsWith("/assets/")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

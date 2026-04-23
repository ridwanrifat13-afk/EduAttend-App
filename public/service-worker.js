const CACHE_NAME = "attendance-app-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install — cache files
self.addEventListener("install", (event) => {
  console.log("Service Worker installing");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch — serve cached files when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

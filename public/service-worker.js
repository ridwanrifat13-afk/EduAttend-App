const CACHE_NAME = "attendance-app-v2";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install
self.addEventListener("install", (event) => {
  console.log("Service Worker installing");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );

  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  event.waitUntil(self.clients.claim());
});

// Fetch
self.addEventListener("fetch", (event) => {

  // VERY IMPORTANT: Ignore non-GET requests (like Firebase writes)
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );

});

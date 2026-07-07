const CACHE_NAME = "applymate-india-v5";
const OFFLINE_URL = "offline.html";

const CORE_ASSETS = [
  "./",
  "index.html",
  "offline.html",
  "style.css",
  "assistant.css",
  "manifest.webmanifest",
  "pwa-register.js",
  "pwa-install.css",
  "icons/icon-192.svg",
  "icons/icon-512.svg"
];

const OFFLINE_PUBLIC_PAGES = [
  "scholarships.html",
  "guides.html",
  "about.html",
  "privacy.html",
  "disclaimer.html",
  "editorial-policy.html",
  "contact.html",
  "nsp-otr-guide.html",
  "scholarship-status-guide.html",
  "engineering-scholarships.html",
  "girl-student-scholarships.html",
  "documents-needed-for-scholarships.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);

      await Promise.allSettled(
        OFFLINE_PUBLIC_PAGES.map((page) => cache.add(page))
      );
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ACTIVATE_NEW_VERSION") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    event.waitUntil(networkResponsePromise.then(() => undefined));
    return cachedResponse;
  }

  return (await networkResponsePromise) || Response.error();
}

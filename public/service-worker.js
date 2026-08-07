// Service Worker for Wondernest ERP – version 7
const CACHE_NAME = 'WonderNest-v7';

// Core assets to pre-cache on install.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
  '/icons.svg',
  '/ChatBotLogo.png',
  '/letterhead.png',
  '/fonts.js',
  '/fonts/Montserrat-Regular.ttf',
  '/fonts/Montserrat-Bold.ttf',
  '/fonts/Canela-Bold-Web.woff2',
  '/fonts/Canela-Light-Web.woff2',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API or Storage requests
  if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/')) {
    return;
  }

  // Navigation requests: network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const freshResponse = await fetch(event.request);

          // Only cache successful, basic responses
          if (freshResponse && freshResponse.ok && freshResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            // IMPORTANT: clone before putting into cache, return the original
            await cache.put(event.request, freshResponse.clone());
          }

          return freshResponse;
        } catch (error) {
          // Offline: serve from cache
          const cachedResponse = await caches.match(event.request);
          return cachedResponse || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Other same-origin requests: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      const networkFetch = fetch(event.request)
        .then(async (networkResponse) => {
          // Cache only successful, basic responses
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            // Clone before caching to avoid body‑used error
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response('Offline', { status: 503 }));

      return cachedResponse || networkFetch;
    })()
  );
});
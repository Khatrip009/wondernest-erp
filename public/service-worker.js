// Service Worker for Wondernest ERP – version 8 (fixed for Vite dev)
const CACHE_NAME = 'WonderNest-v8';

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
// Removed self.clients.claim() to prevent forced page reload when switching tabs.
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
      // No clients.claim() – prevents tab-switch reload
  );
});

// Fetch: handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ------------------------------------------------------------
  // 1. ⛔ SKIP VITE'S INTERNAL DEV DEPENDENCIES (development only)
  // ------------------------------------------------------------
  if (url.pathname.includes('/node_modules/.vite/')) {
    // Let the browser handle these directly – don't intercept
    return;
  }

  // 2. ⛔ SKIP WEBSOCKET (HMR) – don't intercept upgrade requests
  if (event.request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // 3. Never cache Supabase API or Storage requests
  if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/')) {
    return;
  }

  // 4. Navigation requests: network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const freshResponse = await fetch(event.request);

          // Only cache successful, basic responses
          if (freshResponse && freshResponse.ok && freshResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
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

  // 5. Other same-origin requests: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      const networkFetch = fetch(event.request)
        .then(async (networkResponse) => {
          // Cache only successful, basic responses
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response('Offline', { status: 503 }));

      return cachedResponse || networkFetch;
    })()
  );
});
const CACHE_NAME = 'cdm-ilms-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/mobile',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.png',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Install Event: Cache Core Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static shell assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some assets could not be pre-cached:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Smart Routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or websocket / hot-reload calls
  if (request.method !== 'GET' || url.protocol.startsWith('ws') || url.pathname.includes('/@vite/')) {
    return;
  }

  // 1. API Calls (/api/books, /api/student-portal/*): Network first, Cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Only cache read-only GET endpoints like book catalog and student profile
    if (url.pathname.startsWith('/api/books') || url.pathname.startsWith('/api/student-portal/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(async () => {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: 'Offline mode: Cached data unavailable.' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            });
          })
      );
      return;
    }
    return; // Pass through other API calls directly
  }

  // 2. Navigation Requests (e.g. /mobile or /): Network first with offline HTML fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const mobileFallback = await caches.match('/mobile');
          if (mobileFallback) return mobileFallback;
          return caches.match('/');
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Icons, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

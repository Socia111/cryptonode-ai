const CACHE_NAME = `unireli-v${Date.now()}`;

self.addEventListener('install', (event) => {
  // Force activation of new service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all open clients
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests and skip chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache static assets only
        if (event.request.url.includes('/assets/') || 
            event.request.url.includes('.js') || 
            event.request.url.includes('.css') ||
            event.request.url.includes('/manifest.json')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      })
      .catch(() => {
        // Fallback to cache only for static assets
        return caches.match(event.request);
      })
  );
});
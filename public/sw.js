// Force immediate cache bust and fresh content
const CACHE_NAME = `unireli-fresh-${Date.now()}`;

self.addEventListener('install', (event) => {
  console.log('SW: Installing fresh version');
  // Force activation immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating and clearing all caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL existing caches to force fresh content
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('SW: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('SW: Taking control of all clients');
      return self.clients.claim();
    }).then(() => {
      // Force refresh all open tabs
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'FORCE_REFRESH' });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip chrome extensions and non-GET requests
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.includes('extension')) {
    return;
  }

  // Always fetch fresh content, no caching for now to fix black screen
  event.respondWith(
    fetch(event.request, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    .then((response) => {
      // Return fresh response without caching
      return response;
    })
    .catch((error) => {
      console.error('SW: Fetch failed:', error);
      // Return a basic error response instead of cached content
      return new Response('Network error', { 
        status: 408,
        statusText: 'Network timeout' 
      });
    })
  );
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
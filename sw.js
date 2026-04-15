/* ============================================
   VenueFlow — Service Worker
   ============================================
   @description Enables offline support and caching
   for the Progressive Web App. Uses cache-first
   strategy for static assets.
   ============================================ */

const CACHE_NAME = 'venueflow-v3.8.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/index.css',
  './css/components.css',
  './css/animations.css',
  './css/venue-map.css',
  './css/assistant.css',
  './js/utils.js',
  './js/crowd-simulator.js',
  './js/venue-map.js',
  './js/queue-manager.js',
  './js/navigation.js',
  './js/pre-order.js',
  './js/live-feed.js',
  './js/gemini-assistant.js',
  './js/accessibility.js',
  './js/app.js',
  './manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            // Don't cache non-GET or failed responses
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

/* ============================================
   VenueFlow — Service Worker
   ============================================
   @description Enables offline support and caching
   for the Progressive Web App. Uses cache-first
   strategy for static assets, network-first for
   Google Cloud API calls.
   
   @integration Firebase Cloud Messaging (push notifications)
   ============================================ */

const CACHE_NAME = 'venueflow-v4.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/index.css',
  './css/components.css',
  './css/animations.css',
  './css/venue-map.css',
  './css/assistant.css',
  './js/utils.js',
  './js/firebase-config.js',
  './js/google-cloud-services.js',
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

// Google Cloud API domains (network-first, do not cache)
const GOOGLE_API_DOMAINS = [
  'googleapis.com',
  'firebaseio.com',
  'google-analytics.com',
  'googletagmanager.com',
  'generativelanguage.googleapis.com',
  'translation.googleapis.com',
  'texttospeech.googleapis.com',
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

// Fetch — cache-first for static, network-first for Google Cloud APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for Google Cloud API calls
  const isGoogleAPI = GOOGLE_API_DOMAINS.some(domain => url.hostname.includes(domain));
  if (isGoogleAPI) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for server API endpoints
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  // Cache-first for static assets
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

// Firebase Cloud Messaging — handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.notification?.title || 'VenueFlow Alert';
  const options = {
    body: data.notification?.body || 'New venue update available',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="40" fill="%234d8ef7"/%3E%3Cpath d="M96 32L32 67l64 35 64-35L96 32z" fill="white" opacity="0.9"/%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ccircle cx="48" cy="48" r="48" fill="%234d8ef7"/%3E%3C/svg%3E',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open VenueFlow' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

const CACHE_NAME = 'ordeal-v1';
const PRECACHE_URLS = [
  '/',
];

// Static assets to cache aggressively
const STATIC_PATTERNS = [
  /\/icons\//,
  /\.png$/,
  /\.ico$/,
  /manifest\.json$/,
  /\/fonts\//,
];

// API calls — always network-first, fallback to cache
const API_PATTERN = /\/api\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // API: network-first, cache fallback
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // App shell: stale-while-revalidate for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => {
        const network = fetch(request).then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
          return res;
        });
        return cached || network;
      })
    );
  }
});

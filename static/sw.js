const CACHE_NAME = 'harpa-crista-v3';
const OFFLINE_URL = '/';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache audio — it's large and streamed from DO Spaces.
  if (url.hostname.includes('digitaloceanspaces.com')) return;

  // Never cache Amplitude / analytics requests.
  if (url.hostname.includes('amplitude')) return;

  const isNav = event.request.mode === 'navigate';

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);

      // Stale-while-revalidate for static assets
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      const fresh = await networkFetch;
      if (fresh) return fresh;

      // Offline fallback for navigation
      if (isNav) {
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })()
  );
});

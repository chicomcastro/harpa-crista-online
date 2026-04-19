/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker';

const CACHE = `harpa-crista-${version}`;
const AUDIO_CACHE = 'harpa-crista-audio-v1';

const PRECACHE = [...build, ...files, ...prerendered];

const MATERIAL_SYMBOLS_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=add,arrow_back,arrow_downward,arrow_forward,arrow_upward,check,chevron_left,chevron_right,close,cloud_off,content_copy,dark_mode,delete,download,edit,favorite,fullscreen,fullscreen_exit,image,ios_share,library_music,light_mode,more_vert,music_note,playlist_add,present_to_all,queue_music,remove,search,share';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    // Best-effort cross-origin (Google Fonts)
    try {
      const res = await fetch(MATERIAL_SYMBOLS_URL, { mode: 'no-cors' });
      await cache.put(MATERIAL_SYMBOLS_URL, res);
    } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Audio: serve from audio cache only (no auto-cache)
  if (url.hostname.includes('digitaloceanspaces.com')) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      try { return await fetch(event.request); }
      catch { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // Amplitude: bypass entirely
  if (url.hostname.includes('amplitude')) return;

  const isPrecached = url.origin === self.location.origin && PRECACHE.includes(url.pathname);
  const isFont = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';

  // Cache-first for precached + fonts
  if (isPrecached || isFont) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res.ok || res.type === 'opaque') {
          const cache = await caches.open(CACHE);
          cache.put(event.request, res.clone()).catch(() => {});
        }
        return res;
      } catch {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // Everything else: stale-while-revalidate with nav fallback
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(event.request, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) { network.catch(() => {}); return cached; }
    const fresh = await network;
    if (fresh) return fresh;

    if (event.request.mode === 'navigate') {
      const fallback = await cache.match('/') || await cache.match(PRECACHE[0]);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  })());
});

// Audio download coordination from the client
self.addEventListener('message', async (event) => {
  const msg = event.data || {};
  const reply = (data) => event.source?.postMessage(data);

  if (msg.type === 'download-audio') {
    const cache = await caches.open(AUDIO_CACHE);
    const urls = msg.urls || [];
    let done = 0;
    for (const u of urls) {
      try {
        const existing = await cache.match(u);
        if (!existing) {
          const res = await fetch(u);
          if (res.ok) await cache.put(u, res);
        }
      } catch {}
      done++;
      reply({ type: 'download-progress', done, total: urls.length });
    }
    reply({ type: 'download-done', total: urls.length });
  }

  if (msg.type === 'clear-audio-cache') {
    await caches.delete(AUDIO_CACHE);
    reply({ type: 'audio-cache-cleared' });
  }

  if (msg.type === 'audio-cache-status') {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const keys = await cache.keys();
      reply({ type: 'audio-cache-status', count: keys.length });
    } catch {
      reply({ type: 'audio-cache-status', count: 0 });
    }
  }
});

/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker';

const CACHE = `harpa-crista-${version}`;
// O áudio foi aposentado (#18): o bucket harpa.nyc3.digitaloceanspaces.com não existe mais. O
// activate abaixo deixou de poupar o cache 'harpa-crista-audio-v1', então o que sobrou no aparelho
// de quem chegou a baixar é apagado na próxima visita.

const PRECACHE = [...build, ...files, ...prerendered];

// Tem que ser idêntica à do src/app.html, senão o cache não casa e os ícones somem offline.
const MATERIAL_SYMBOLS_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=add,arrow_back,campaign,arrow_downward,arrow_forward,arrow_upward,bolt,check,check_circle,chevron_left,chevron_right,close,cloud_off,content_copy,dark_mode,delete,download,edit,favorite,format_size,fullscreen,fullscreen_exit,headphones,image,install_mobile,ios_share,library_music,light_mode,lock_open,more_horiz,more_vert,music_note,pause,phone_android,phone_iphone,photo_camera,play_arrow,playlist_add,present_to_all,queue_music,remove,search,share';

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
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

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


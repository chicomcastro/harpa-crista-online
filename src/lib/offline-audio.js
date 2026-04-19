import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const audioCacheStatus = writable({ count: 0, downloading: false, progress: 0, total: 0 });

export function audioUrlFor(number) {
  return `https://harpa.nyc3.digitaloceanspaces.com/${String(number).padStart(3, '0')}.mp3`;
}

function getController() {
  if (!browser || !navigator.serviceWorker) return null;
  return navigator.serviceWorker.controller;
}

export async function refreshAudioCacheStatus() {
  if (!browser || !('caches' in window)) return;
  try {
    const cache = await caches.open('harpa-crista-audio-v1');
    const keys = await cache.keys();
    audioCacheStatus.update(s => ({ ...s, count: keys.length }));
  } catch {}
}

export async function downloadAudios(numbers) {
  if (!browser || !numbers?.length) return;
  const ctrl = getController();
  if (!ctrl) { alert('Service worker ainda não está pronto. Recarregue a página e tente de novo.'); return; }
  const urls = numbers.map(audioUrlFor);
  audioCacheStatus.set({ count: 0, downloading: true, progress: 0, total: urls.length });

  const onMessage = (e) => {
    const msg = e.data || {};
    if (msg.type === 'download-progress') {
      audioCacheStatus.update(s => ({ ...s, progress: msg.done, total: msg.total }));
    }
    if (msg.type === 'download-done') {
      audioCacheStatus.update(s => ({ ...s, downloading: false, progress: msg.total }));
      refreshAudioCacheStatus();
      navigator.serviceWorker.removeEventListener('message', onMessage);
    }
  };
  navigator.serviceWorker.addEventListener('message', onMessage);
  ctrl.postMessage({ type: 'download-audio', urls });
}

export async function clearAudioCache() {
  if (!browser) return;
  const ctrl = getController();
  if (ctrl) ctrl.postMessage({ type: 'clear-audio-cache' });
  try { await caches.delete('harpa-crista-audio-v1'); } catch {}
  audioCacheStatus.set({ count: 0, downloading: false, progress: 0, total: 0 });
}

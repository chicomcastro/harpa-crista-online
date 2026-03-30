import { writable } from 'svelte/store';
import { browser } from '$app/environment';

import songsData from '$lib/songs.json';

/** @type {Array<{number: number, title: string, content: string}>} */
export const songs = songsData;

/** Favorites store — persists to localStorage */
function createFavorites() {
  const initial = browser ? JSON.parse(localStorage.getItem('favorites') || '[]') : [];
  const { subscribe, update } = writable(initial);

  return {
    subscribe,
    toggle(number) {
      update(favs => {
        const next = favs.includes(number)
          ? favs.filter(n => n !== number)
          : [...favs, number];
        if (browser) localStorage.setItem('favorites', JSON.stringify(next));
        return next;
      });
    }
  };
}
export const favorites = createFavorites();

/** Dark mode store — persists to localStorage, syncs with <html> class */
function createDarkMode() {
  let initial = false;
  if (browser) {
    const stored = localStorage.getItem('darkMode');
    initial = stored !== null
      ? stored === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', initial);
  }
  const { subscribe, update } = writable(initial);

  return {
    subscribe,
    toggle() {
      update(v => {
        const next = !v;
        if (browser) {
          localStorage.setItem('darkMode', String(next));
          document.documentElement.classList.toggle('dark', next);
        }
        return next;
      });
    }
  };
}
export const darkMode = createDarkMode();

/** Font size store — persists to localStorage */
function createFontSize() {
  const initial = browser ? parseInt(localStorage.getItem('fontSize') || '18') : 18;
  const { subscribe, update, set } = writable(initial);

  return {
    subscribe,
    increase() {
      update(v => {
        const next = Math.min(32, v + 2);
        if (browser) localStorage.setItem('fontSize', String(next));
        return next;
      });
    },
    decrease() {
      update(v => {
        const next = Math.max(12, v - 2);
        if (browser) localStorage.setItem('fontSize', String(next));
        return next;
      });
    },
    reset() {
      set(18);
      if (browser) localStorage.setItem('fontSize', '18');
    }
  };
}
export const fontSize = createFontSize();

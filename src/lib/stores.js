import { writable } from 'svelte/store';
import { browser } from '$app/environment';

import songsData from '$lib/songs.json';

/** @type {Array<{number: number, title: string, content: string}>} */
export const songs = songsData;

/** Favorites store — persists to localStorage */
function createFavorites() {
  const initial = browser ? JSON.parse(localStorage.getItem('favorites') || '[]') : [];
  const { subscribe, update, set } = writable(initial);
  const persist = (list) => { if (browser) localStorage.setItem('favorites', JSON.stringify(list)); };

  return {
    subscribe,
    toggle(number) {
      update(favs => {
        const next = favs.includes(number)
          ? favs.filter(n => n !== number)
          : [...favs, number];
        persist(next);
        return next;
      });
    },
    replace(numbers) {
      const clean = Array.from(new Set(numbers.filter(n => Number.isInteger(n) && n > 0)));
      persist(clean);
      set(clean);
    },
    merge(numbers) {
      update(favs => {
        const next = Array.from(new Set([...favs, ...numbers.filter(n => Number.isInteger(n) && n > 0)]));
        persist(next);
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

/** Recently viewed hymns — stores last N hymn numbers, most recent first */
function createRecentlyViewed(limit = 30) {
  const initial = browser ? JSON.parse(localStorage.getItem('recentlyViewed') || '[]') : [];
  const { subscribe, update } = writable(initial);

  return {
    subscribe,
    add(number) {
      update(list => {
        const next = [number, ...list.filter(n => n !== number)].slice(0, limit);
        if (browser) localStorage.setItem('recentlyViewed', JSON.stringify(next));
        return next;
      });
    },
    clear() {
      if (browser) localStorage.removeItem('recentlyViewed');
      update(() => []);
    }
  };
}
export const recentlyViewed = createRecentlyViewed();

/** Playlists — named ordered lists of hymn numbers */
function createPlaylists() {
  const initial = browser ? JSON.parse(localStorage.getItem('playlists') || '[]') : [];
  const { subscribe, update } = writable(initial);
  const persist = (list) => { if (browser) localStorage.setItem('playlists', JSON.stringify(list)); };

  return {
    subscribe,
    create(name) {
      const id = crypto.randomUUID();
      update(list => {
        const next = [...list, { id, name, numbers: [], createdAt: Date.now() }];
        persist(next);
        return next;
      });
      return id;
    },
    rename(id, name) {
      update(list => {
        const next = list.map(p => p.id === id ? { ...p, name } : p);
        persist(next);
        return next;
      });
    },
    remove(id) {
      update(list => {
        const next = list.filter(p => p.id !== id);
        persist(next);
        return next;
      });
    },
    addSong(id, number) {
      update(list => {
        const next = list.map(p => p.id === id && !p.numbers.includes(number)
          ? { ...p, numbers: [...p.numbers, number] }
          : p);
        persist(next);
        return next;
      });
    },
    removeSong(id, number) {
      update(list => {
        const next = list.map(p => p.id === id
          ? { ...p, numbers: p.numbers.filter(n => n !== number) }
          : p);
        persist(next);
        return next;
      });
    },
    reorder(id, numbers) {
      update(list => {
        const next = list.map(p => p.id === id ? { ...p, numbers } : p);
        persist(next);
        return next;
      });
    },
    import(playlist) {
      const id = crypto.randomUUID();
      update(list => {
        const next = [...list, { ...playlist, id, createdAt: Date.now() }];
        persist(next);
        return next;
      });
      return id;
    }
  };
}
export const playlists = createPlaylists();

/** Personal notes per hymn number — { [number]: string } */
function createNotes() {
  const initial = browser ? JSON.parse(localStorage.getItem('notes') || '{}') : {};
  const { subscribe, update } = writable(initial);

  return {
    subscribe,
    set(number, text) {
      update(notes => {
        const next = { ...notes };
        if (text.trim()) next[number] = text;
        else delete next[number];
        if (browser) localStorage.setItem('notes', JSON.stringify(next));
        return next;
      });
    }
  };
}
export const notes = createNotes();


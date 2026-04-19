import songs from '$lib/songs.json';

export const prerender = true;
export const ssr = true;

export function entries() {
  return songs.map(s => ({ id: String(s.id) }));
}

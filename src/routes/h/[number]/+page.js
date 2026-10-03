import songs from '$lib/songs.json';

// Pré-renderizado para cada número: links /h/<nº> (usados nas descrições do YouTube) respondem 200
// em vez de cair no 404.html do GitHub Pages, o que quebrava o preview de link.
export const prerender = true;
export const ssr = true;

export function entries() {
  return songs.map(s => ({ number: String(s.number) }));
}

export function load({ params }) {
  const song = songs.find(s => s.number === parseInt(params.number));
  return { song: song ? { id: song.id, number: song.number, title: song.title } : null };
}

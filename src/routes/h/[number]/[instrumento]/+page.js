import songs from '$lib/songs.json';
import partituras from '../../../../../data/partituras.json';
import { error } from '@sveltejs/kit';

// Uma página por partitura (hino × instrumento) para a busca "partitura {hino} {instrumento}":
// conteúdo próprio e canonical próprio, ao contrário de /h/<nº>, que só redireciona.
export const prerender = true;
export const ssr = true;

export function entries() {
  return Object.entries(partituras.hinos).flatMap(([number, h]) =>
    h.versoes.map(v => ({ number, instrumento: v.instrumento }))
  );
}

export function load({ params }) {
  const hino = partituras.hinos[params.number];
  const versao = hino?.versoes.find(v => v.instrumento === params.instrumento);
  const song = songs.find(s => s.number === parseInt(params.number));
  if (!hino || !versao || !song) error(404, 'Partitura não encontrada');
  return {
    song: { id: song.id, number: song.number, title: song.title, content: song.content },
    nome: hino.nome,
    versao,
    outras: hino.versoes.filter(v => v.instrumento !== versao.instrumento)
  };
}

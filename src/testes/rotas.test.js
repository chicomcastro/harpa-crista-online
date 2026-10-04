import { describe, it, expect } from 'vitest';
import songs from '$lib/songs.json';
import partituras from '../../data/partituras.json';
import * as hino from '../routes/h/[number]/+page.js';
import * as hinoInstrumento from '../routes/h/[number]/[instrumento]/+page.js';
import * as hinoSlug from '../routes/song/[id]/+page.js';

describe('/h/[number]', () => {
  // Os links /h/<nº> vão nas descrições do YouTube: se saírem do prerender, o GitHub Pages
  // devolve o 404.html e o preview do link quebra.
  it('pré-renderiza uma entrada por hino do acervo', () => {
    const e = hino.entries();
    expect(e).toHaveLength(songs.length);
    expect(hino.prerender).toBe(true);
  });

  it('carrega o hino pelo número', () => {
    expect(hino.load({ params: { number: '39' } }).song).toMatchObject({ number: 39 });
  });

  it('número inexistente devolve song null, sem estourar', () => {
    expect(hino.load({ params: { number: '99999' } }).song).toBeNull();
  });
});

describe('/h/[number]/[instrumento]', () => {
  const primeiro = Object.entries(partituras.hinos)[0];
  const [numero, dados] = primeiro;
  const instrumento = dados.versoes[0].instrumento;

  it('uma entrada por par hino × instrumento', () => {
    const total = Object.values(partituras.hinos).reduce((n, h) => n + h.versoes.length, 0);
    expect(hinoInstrumento.entries()).toHaveLength(total);
  });

  it('carrega a versão pedida e lista as outras', () => {
    const d = hinoInstrumento.load({ params: { number: numero, instrumento } });
    expect(d.versao.instrumento).toBe(instrumento);
    expect(d.outras.some(v => v.instrumento === instrumento)).toBe(false);
    expect(d.song.number).toBe(parseInt(numero));
  });

  it('instrumento que não existe para o hino vira 404', () => {
    expect(() => hinoInstrumento.load({ params: { number: numero, instrumento: 'gaita' } })).toThrow();
  });
});

describe('/song/[id]', () => {
  it('pré-renderiza todos os hinos', () => {
    expect(hinoSlug.entries()).toHaveLength(songs.length);
  });
});

describe('acervo', () => {
  it('todo hino tem número, título e conteúdo', () => {
    const quebrados = songs.filter(s => !s.number || !s.title?.trim() || !s.content?.trim());
    expect(quebrados).toEqual([]);
  });

  it('não há número repetido', () => {
    expect(new Set(songs.map(s => s.number)).size).toBe(songs.length);
  });

  it('toda partitura aponta para um hino que existe', () => {
    const numeros = new Set(songs.map(s => s.number));
    const orfas = Object.keys(partituras.hinos).filter(n => !numeros.has(parseInt(n)));
    expect(orfas).toEqual([]);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseVerses, buildPresentationSequence, getPreview, highlightMatch,
  searchSongs, hymnOfTheDay, encodeNumbers, decodeNumbers,
  encodePlaylist, decodePlaylist
} from './utils.js';

const HINO = `1. Bendito seja o Cordeiro
Que na cruz por nós padeceu!

ALVO MAIS QUE A NEVE!
SIM, NESSE SANGUE LAVADO

2. Quão espinhosa a coroa
Que Jesus por nós suportou!`;

describe('parseVerses', () => {
  it('separa estrofes por linha em branco e marca o refrão', () => {
    const v = parseVerses(HINO);
    expect(v).toHaveLength(3);
    expect(v.map(b => b.isChorus)).toEqual([false, true, false]);
    expect(v[0].lines).toHaveLength(2);
  });

  // O que distingue refrão de estrofe é só o "1." no começo — não há marcação no .txt.
  it('trata como refrão o bloco que não começa com número', () => {
    expect(parseVerses('SEM NÚMERO AQUI')[0].isChorus).toBe(true);
    expect(parseVerses('1. Com número')[0].isChorus).toBe(false);
  });

  it('descarta bloco vazio e espaço solto', () => {
    expect(parseVerses('1. a\n\n   \n\n2. b')).toHaveLength(2);
    expect(parseVerses('')).toEqual([]);
  });
});

describe('buildPresentationSequence', () => {
  it('intercala o refrão depois de cada estrofe', () => {
    const seq = buildPresentationSequence(parseVerses(HINO));
    // 2 estrofes × (1 slide de 2 linhas) + refrão (1 slide) depois de cada
    expect(seq).toHaveLength(4);
    expect(seq[1].isChorus).toBe(true);
    expect(seq[3].isChorus).toBe(true);
  });

  it('quebra bloco longo em slides de até 2 linhas', () => {
    const seq = buildPresentationSequence([{ lines: ['a', 'b', 'c', 'd', 'e'], isChorus: false }]);
    expect(seq.map(s => s.lines.length)).toEqual([2, 2, 1]);
  });

  it('sem refrão, devolve só as estrofes', () => {
    const seq = buildPresentationSequence([{ lines: ['a'], isChorus: false }, { lines: ['b'], isChorus: false }]);
    expect(seq).toHaveLength(2);
  });

  it('só refrão, sem estrofe, não vira lista vazia', () => {
    const seq = buildPresentationSequence([{ lines: ['a'], isChorus: true }]);
    expect(seq).toHaveLength(1);
  });

  it('o slide de título vem na frente quando pedido', () => {
    const seq = buildPresentationSequence(parseVerses(HINO), { number: 39, title: 'ALVO MAIS QUE A NEVE' });
    expect(seq[0]).toMatchObject({ isTitle: true, number: 39 });
  });
});

describe('getPreview', () => {
  it('tira o prefixo do número e junta as linhas', () => {
    expect(getPreview(HINO)).toBe('Bendito seja o Cordeiro / Que na cruz por nós padeceu!');
  });

  it('respeita o limite de linhas', () => {
    expect(getPreview(HINO, 1)).toBe('Bendito seja o Cordeiro');
  });
});

describe('highlightMatch', () => {
  it('envolve o trecho achado em <mark>', () => {
    expect(highlightMatch('Alvo mais que a neve', 'neve')).toContain('<mark');
  });

  it('ignora busca curta demais', () => {
    expect(highlightMatch('Alvo', 'a')).toBe('Alvo');
  });

  // Uma busca por "(" não pode explodir o RegExp.
  it('escapa caracteres de regex', () => {
    expect(() => highlightMatch('a (b)', '(b')).not.toThrow();
    expect(highlightMatch('a (b)', '(b')).toContain('<mark');
  });
});

describe('searchSongs', () => {
  const acervo = [
    { number: 1, title: 'CHUVAS DE GRAÇA', content: 'Chuvas de graça' },
    { number: 39, title: 'ALVO MAIS QUE A NEVE', content: 'Bendito seja o Cordeiro' },
    { number: 390, title: 'OUTRO HINO', content: 'Nada a ver' },
    { number: 7, title: 'SOU PEREGRINO', content: 'Alvo caminho do Cordeiro' }
  ];

  it('busca vazia devolve tudo sem trecho', () => {
    const r = searchSongs(acervo, '  ');
    expect(r).toHaveLength(4);
    expect(r[0].snippet).toBeNull();
  });

  it('título exato ganha de título que só contém', () => {
    const r = searchSongs(acervo, 'alvo mais que a neve');
    expect(r[0].song.number).toBe(39);
  });

  it('número exato vem antes do número que só começa igual', () => {
    const r = searchSongs(acervo, '39');
    expect(r[0].song.number).toBe(39);
    expect(r.map(x => x.song.number)).toContain(390);
  });

  it('acha no conteúdo e devolve o trecho', () => {
    const r = searchSongs(acervo, 'peregrino');
    expect(r[0].song.number).toBe(7);
    const porConteudo = searchSongs(acervo, 'caminho');
    expect(porConteudo[0].snippet).toContain('caminho');
  });

  it('sem resultado devolve lista vazia', () => {
    expect(searchSongs(acervo, 'zzzzz')).toEqual([]);
  });
});

describe('hymnOfTheDay', () => {
  afterEach(() => vi.useRealTimers());

  it('é o mesmo hino o dia inteiro e muda no dia seguinte', () => {
    const acervo = Array.from({ length: 640 }, (_, i) => ({ number: i + 1 }));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T08:00:00'));
    const manha = hymnOfTheDay(acervo);
    vi.setSystemTime(new Date('2026-10-04T23:00:00'));
    expect(hymnOfTheDay(acervo)).toBe(manha);
    vi.setSystemTime(new Date('2026-10-05T08:00:00'));
    expect(hymnOfTheDay(acervo)).not.toBe(manha);
  });

  it('acervo vazio devolve null', () => {
    expect(hymnOfTheDay([])).toBeNull();
  });
});

describe('códigos compartilháveis', () => {
  it('números sobrevivem à ida e volta', () => {
    const n = [1, 39, 640];
    expect(decodeNumbers(encodeNumbers(n))).toEqual(n);
  });

  // O código vai na URL: + e / quebrariam o link, por isso a troca por - e _.
  it('não usa caracteres que quebram URL', () => {
    const code = encodeNumbers(Array.from({ length: 50 }, (_, i) => i * 13));
    expect(code).not.toMatch(/[+/=]/);
  });

  it('código inválido devolve null em vez de estourar', () => {
    expect(decodeNumbers('não-é-base64!!')).toBeNull();
    expect(decodeNumbers(btoa('{"a":1}'))).toBeNull();
    expect(decodePlaylist('xxx')).toBeNull();
  });

  it('playlist sobrevive à ida e volta', () => {
    const pl = { name: 'Culto de domingo', numbers: [39, 40] };
    expect(decodePlaylist(encodePlaylist(pl))).toEqual(pl);
  });

  it('descarta números inválidos na volta', () => {
    const code = btoa(JSON.stringify({ n: 'x', s: [1, 'a', 2.5, 3] }));
    expect(decodePlaylist(code).numbers).toEqual([1, 3]);
  });
});

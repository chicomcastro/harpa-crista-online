import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// O vitest resolve `$app/environment` pelo caminho de servidor, onde `browser` é false — e aí
// nenhuma store persiste nem lê o localStorage. Aqui o alvo é justamente esse comportamento.
vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false, version: 'test' }));

// As stores leem o localStorage na importação do módulo. Para testar o estado inicial é preciso
// semear o storage e reimportar com o cache do módulo limpo — daí o import dinâmico em todo teste.
async function carregar() {
  vi.resetModules();
  return import('./stores.js');
}

beforeEach(() => {
  localStorage.clear();
});

describe('favorites', () => {
  it('alterna um número e persiste', async () => {
    const { favorites } = await carregar();
    favorites.toggle(39);
    expect(get(favorites)).toEqual([39]);
    expect(JSON.parse(localStorage.getItem('favorites'))).toEqual([39]);
    favorites.toggle(39);
    expect(get(favorites)).toEqual([]);
  });

  it('lê o que já estava salvo', async () => {
    localStorage.setItem('favorites', JSON.stringify([1, 2]));
    const { favorites } = await carregar();
    expect(get(favorites)).toEqual([1, 2]);
  });

  it('replace descarta repetidos e não-inteiros', async () => {
    const { favorites } = await carregar();
    favorites.replace([3, 3, 0, -1, 'x', 7.5, 9]);
    expect(get(favorites)).toEqual([3, 9]);
  });

  it('merge soma ao que já existe sem duplicar', async () => {
    const { favorites } = await carregar();
    favorites.replace([1, 2]);
    favorites.merge([2, 3]);
    expect(get(favorites)).toEqual([1, 2, 3]);
  });
});

describe('recentlyViewed', () => {
  it('coloca o mais recente na frente, sem repetir', async () => {
    const { recentlyViewed } = await carregar();
    recentlyViewed.add(1);
    recentlyViewed.add(2);
    recentlyViewed.add(1);
    expect(get(recentlyViewed)).toEqual([1, 2]);
  });

  it('limita a 30', async () => {
    const { recentlyViewed } = await carregar();
    for (let n = 1; n <= 35; n++) recentlyViewed.add(n);
    const lista = get(recentlyViewed);
    expect(lista).toHaveLength(30);
    expect(lista[0]).toBe(35);
  });

  it('clear esvazia e apaga do storage', async () => {
    const { recentlyViewed } = await carregar();
    recentlyViewed.add(1);
    recentlyViewed.clear();
    expect(get(recentlyViewed)).toEqual([]);
    expect(localStorage.getItem('recentlyViewed')).toBeNull();
  });
});

describe('playlists', () => {
  it('cria, renomeia, adiciona e remove hino', async () => {
    const { playlists } = await carregar();
    const id = playlists.create('Culto de domingo');
    playlists.addSong(id, 39);
    playlists.addSong(id, 39); // repetido é ignorado
    playlists.addSong(id, 40);
    playlists.rename(id, 'Culto da noite');
    let pl = get(playlists).find(p => p.id === id);
    expect(pl.name).toBe('Culto da noite');
    expect(pl.numbers).toEqual([39, 40]);
    playlists.removeSong(id, 39);
    pl = get(playlists).find(p => p.id === id);
    expect(pl.numbers).toEqual([40]);
  });

  it('guarda tom por hino e data da lista', async () => {
    const { playlists } = await carregar();
    const id = playlists.create('x');
    playlists.setTom(id, 39, 'Eb');
    playlists.setData(id, '2026-10-11');
    const pl = get(playlists).find(p => p.id === id);
    expect(pl.tons).toEqual({ 39: 'Eb' });
    expect(pl.data).toBe('2026-10-11');
  });

  it('data vazia volta a null', async () => {
    const { playlists } = await carregar();
    const id = playlists.create('x');
    playlists.setData(id, '2026-10-11');
    playlists.setData(id, '');
    expect(get(playlists)[0].data).toBeNull();
  });

  // Listas salvas antes de #14 não têm `tons` nem `data`; reescrever o localStorage de quem já
  // usa o app não é opção, então o formato velho precisa continuar funcionando.
  it('aceita lista antiga sem tons/data', async () => {
    localStorage.setItem('playlists', JSON.stringify([{ id: 'a', name: 'Antiga', numbers: [1] }]));
    const { playlists } = await carregar();
    playlists.setTom('a', 1, 'G');
    expect(get(playlists)[0].tons).toEqual({ 1: 'G' });
  });

  it('reorder troca a ordem e remove apaga a lista', async () => {
    const { playlists } = await carregar();
    const id = playlists.create('x');
    playlists.addSong(id, 1);
    playlists.addSong(id, 2);
    playlists.reorder(id, [2, 1]);
    expect(get(playlists)[0].numbers).toEqual([2, 1]);
    playlists.remove(id);
    expect(get(playlists)).toEqual([]);
  });

  it('import entra com id próprio', async () => {
    const { playlists } = await carregar();
    const id = playlists.import({ name: 'Compartilhada', numbers: [5, 6] });
    const pl = get(playlists).find(p => p.id === id);
    expect(pl.name).toBe('Compartilhada');
    expect(pl.numbers).toEqual([5, 6]);
  });
});

describe('notes', () => {
  it('salva e apaga quando o texto fica vazio', async () => {
    const { notes } = await carregar();
    notes.set(39, 'tom original Eb');
    expect(get(notes)[39]).toBe('tom original Eb');
    notes.set(39, '   ');
    expect(get(notes)[39]).toBeUndefined();
  });
});

describe('fontSize', () => {
  it('sobe, desce e volta ao padrão dentro dos limites', async () => {
    const { fontSize } = await carregar();
    expect(get(fontSize)).toBe(18);
    for (let i = 0; i < 20; i++) fontSize.increase();
    expect(get(fontSize)).toBe(32);
    for (let i = 0; i < 20; i++) fontSize.decrease();
    expect(get(fontSize)).toBe(12);
    fontSize.reset();
    expect(get(fontSize)).toBe(18);
  });
});

describe('colunasLetra', () => {
  it('só aceita 1 ou 2 e persiste', async () => {
    const { colunasLetra } = await carregar();
    expect(get(colunasLetra)).toBe(1);
    colunasLetra.set(2);
    expect(get(colunasLetra)).toBe(2);
    expect(localStorage.getItem('colunasLetra')).toBe('2');
    colunasLetra.set(7);
    expect(get(colunasLetra)).toBe(1);
  });

  it('lê a preferência salva', async () => {
    localStorage.setItem('colunasLetra', '2');
    const { colunasLetra } = await carregar();
    expect(get(colunasLetra)).toBe(2);
  });
});

describe('darkMode', () => {
  it('alterna a classe dark no <html>', async () => {
    const { darkMode } = await carregar();
    const antes = get(darkMode);
    darkMode.toggle();
    expect(get(darkMode)).toBe(!antes);
    expect(document.documentElement.classList.contains('dark')).toBe(!antes);
    expect(localStorage.getItem('darkMode')).toBe(String(!antes));
  });

  it('a preferência salva vence o prefers-color-scheme', async () => {
    localStorage.setItem('darkMode', 'true');
    const { darkMode } = await carregar();
    expect(get(darkMode)).toBe(true);
  });
});

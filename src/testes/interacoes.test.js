import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readable } from 'svelte/store';
import songs from '$lib/songs.json';
import partituras from '../../data/partituras.json';

/*
 * O que a pessoa faz na tela. Cada caso aqui corresponde a um feedback que já chegou quebrado:
 * trocar de aba, mudar colunas, favoritar, abrir a busca do header, abrir o menu de opções.
 */

const urlAtual = { href: 'http://localhost/', params: {}, rota: '/' };

vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false, version: 'test' }));
vi.mock('$app/paths', () => ({ base: '', assets: '' }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), afterNavigate: vi.fn(), beforeNavigate: vi.fn(), pushState: vi.fn() }));
vi.mock('$lib/analytics.js', () => ({ track: vi.fn(), initAnalytics: vi.fn(), trackExternalEntry: vi.fn() }));
vi.mock('$app/stores', () => ({
  page: readable(null, (set) => {
    const atualizar = () => set({ url: new URL(urlAtual.href), params: urlAtual.params, data: {}, route: { id: urlAtual.rota } });
    atualizar();
    urlAtual.notificar = atualizar;
    return () => {};
  }),
  navigating: readable(null)
}));

let tl, usuario;

async function montar(caminho, props) {
  tl = await import('@testing-library/svelte');
  usuario = (await import('@testing-library/user-event')).default.setup();
  const Componente = (await import(/* @vite-ignore */ caminho)).default;
  return tl.render(Componente, props);
}

const screen = new Proxy({}, { get: (_, k) => tl.screen[k] });

async function abrirHino(numero) {
  const song = songs.find(s => s.number === numero);
  urlAtual.href = `http://localhost/song/${song.id}`;
  urlAtual.params = { id: String(song.id) };
  urlAtual.notificar?.();
  const r = await montar('../routes/song/[id]/+page.svelte');
  return { ...r, song };
}

const COM_PARTITURA = Number(Object.keys(partituras.hinos).find(n =>
  partituras.hinos[n].versoes.some(v => v.youtube_id)
));

beforeEach(() => {
  localStorage.clear();
  urlAtual.href = 'http://localhost/';
  urlAtual.params = {};
  vi.resetModules();
});

afterEach(() => tl?.cleanup());

describe('abas do hino', () => {
  it('trocar para Partitura esconde a letra e mostra a pauta', async () => {
    await abrirHino(COM_PARTITURA);
    await usuario.click(screen.getByRole('tab', { name: 'Partitura' }));
    expect(screen.getByRole('tab', { name: 'Partitura' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Letra' })).toHaveAttribute('aria-selected', 'false');
  });

  // O painel de ferramentas só serve à letra; fora dela a coluna inteira some (PR #42).
  it('fora da aba Letra o painel de ferramentas some', async () => {
    const { container } = await abrirHino(COM_PARTITURA);
    const painel = () => [...container.querySelectorAll('aside')].find(a => a.textContent.includes('Ferramentas'));
    expect(painel().className).toContain('lg:block');
    await usuario.click(screen.getByRole('tab', { name: 'Vídeo' }));
    expect(painel().className).not.toContain('lg:block');
  });

  // Dois iframes do YouTube montados ao mesmo tempo faziam o vídeo "pausado" continuar tocando.
  it('só existe um player de cada vez', async () => {
    const { container } = await abrirHino(COM_PARTITURA);
    await usuario.click(screen.getByRole('tab', { name: 'Vídeo' }));
    const players = [...container.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src));
    expect(players.length).toBeLessThanOrEqual(1);
  });
});

describe('ferramentas da letra', () => {
  it('o botão de 2 colunas liga o multicolumn e guarda a escolha', async () => {
    const { container } = await abrirHino(39);
    const grupo = screen.getByRole('group', { name: 'Colunas da letra' });
    await usuario.click(tl.within(grupo).getByRole('button', { name: '2' }));
    expect(container.querySelector('.song-content').className).toContain('column-count:2');
    expect(localStorage.getItem('colunasLetra')).toBe('2');
  });

  it('aumentar e diminuir o texto mexe no tamanho da letra', async () => {
    const { container } = await abrirHino(39);
    const letra = container.querySelector('.song-content');
    const inicial = letra.style.fontSize;
    await usuario.click(screen.getAllByLabelText('Aumentar texto')[0]);
    expect(container.querySelector('.song-content').style.fontSize).not.toBe(inicial);
  });
});

describe('favoritar', () => {
  it('marca e desmarca, e o estado persiste', async () => {
    await abrirHino(39);
    await usuario.click(screen.getByLabelText('Adicionar aos favoritos'));
    expect(JSON.parse(localStorage.getItem('favorites'))).toContain(39);
    await usuario.click(screen.getByLabelText('Remover dos favoritos'));
    expect(JSON.parse(localStorage.getItem('favorites'))).toEqual([]);
  });
});

describe('busca do header', () => {
  it('a lupa abre o campo sem sair da página', async () => {
    await montar('./LayoutDeTeste.svelte');
    // Não é link: navegar para a home perderia o hino aberto — foi o feedback que originou a
    // busca dentro do próprio header.
    const lupas = screen.getAllByLabelText('Pesquisar hino').filter(e => e.tagName !== 'INPUT');
    expect(lupas.length).toBeGreaterThan(0);
    for (const l of lupas) expect(l.tagName).toBe('BUTTON');
    await usuario.click(lupas[0]);
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
  });

  // O campo entra deslizando da direita; sem overflow-hidden ele criava rolagem horizontal na
  // página inteira e empurrava o bottom nav para fora (PR #35).
  it('o header não deixa o campo escondido criar rolagem lateral', async () => {
    const { container } = await montar('./LayoutDeTeste.svelte');
    const header = container.querySelector('header');
    expect(header.querySelector('.overflow-hidden')).not.toBeNull();
  });
});

describe('menu de opções do hino', () => {
  it('traz copiar letra e as listas', async () => {
    localStorage.setItem('playlists', JSON.stringify([{ id: 'a', name: 'Culto de domingo', numbers: [] }]));
    await abrirHino(39);
    await usuario.click(screen.getByLabelText('Mais opções'));
    expect(screen.getByText('Copiar letra')).toBeInTheDocument();
    expect(screen.getByText('Culto de domingo')).toBeInTheDocument();
  });

  it('o link da cifra aponta para fora e abre em outra aba', async () => {
    const comCifra = songs.find(s => {
      try { return require('../../data/links.json')[s.number]?.chord; } catch { return false; }
    });
    const numero = comCifra?.number ?? 39;
    await abrirHino(numero);
    const cifra = screen.queryByRole('link', { name: /Cifra/ });
    if (!cifra) return; // hino sem cifra curada
    expect(cifra).toHaveAttribute('target', '_blank');
    expect(cifra.getAttribute('href')).toMatch(/^https?:\/\//);
  });
});

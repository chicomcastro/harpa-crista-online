import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readable } from 'svelte/store';
import songs from '$lib/songs.json';
import partituras from '../../data/partituras.json';

/*
 * Smoke test das telas: cada rota monta, mostra o que a pessoa foi buscar ali e não quebra.
 * Não é teste de pixel — é a rede que pega import quebrado, store faltando, `$derived` que lê
 * variável antes da hora e texto some. Foi exatamente essa classe de erro que apareceu nas
 * últimas regressões (div desbalanceada, "Cannot access 'busca' before initialization").
 */

const urlAtual = { href: 'http://localhost/', params: {} };

vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false, version: 'test' }));
vi.mock('$app/paths', () => ({ base: '', assets: '' }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), afterNavigate: vi.fn(), beforeNavigate: vi.fn(), pushState: vi.fn() }));
vi.mock('$lib/analytics.js', () => ({ track: vi.fn(), initAnalytics: vi.fn(), trackExternalEntry: vi.fn() }));
vi.mock('$app/stores', () => ({
  page: readable(null, (set) => {
    const atualizar = () => set({ url: new URL(urlAtual.href), params: urlAtual.params, data: {} });
    atualizar();
    urlAtual.notificar = atualizar;
    return () => {};
  }),
  navigating: readable(null)
}));

function emRota(href, params = {}) {
  urlAtual.href = href;
  urlAtual.params = params;
  urlAtual.notificar?.();
}

const HINO_COM_PARTITURA = Number(Object.keys(partituras.hinos)[0]);

/*
 * As stores leem o localStorage na importação, então cada teste precisa de módulos novos. Mas
 * `resetModules` também criaria uma segunda cópia do runtime do Svelte: o componente usaria uma e
 * o testing-library a outra, e todo `$effect` morreria com `effect_orphan`. Por isso o
 * testing-library é importado DEPOIS do reset, junto do componente.
 */
let tl;

async function montar(caminho, props) {
  tl = await import('@testing-library/svelte');
  const Componente = (await import(/* @vite-ignore */ caminho)).default;
  return tl.render(Componente, props);
}

const screen = new Proxy({}, { get: (_, k) => tl.screen[k] });
const within = (el) => tl.within(el);

beforeEach(() => {
  localStorage.clear();
  emRota('http://localhost/');
  vi.resetModules();
});

afterEach(() => tl?.cleanup());

describe('home', () => {
  it('lista os hinos e diz quantos são', async () => {
    await montar('../routes/+page.svelte');
    expect(screen.getByPlaceholderText(/título ou trecho/i)).toBeInTheDocument();
    expect(document.body.textContent).toContain(String(songs.length));
  });

  it('filtra pela busca na URL', async () => {
    emRota('http://localhost/?q=alvo+mais+que+a+neve');
    await montar('../routes/+page.svelte');
    expect(screen.getByPlaceholderText(/título ou trecho/i).value).toBe('alvo mais que a neve');
    expect(document.body.textContent).toContain('ALVO MAIS QUE A NEVE');
  });

  it('o filtro de partitura na URL já vem marcado', async () => {
    emRota('http://localhost/?part=1');
    await montar('../routes/+page.svelte');
    expect(document.body.textContent.toUpperCase()).toContain('PARTITURA');
  });
});

describe('página do hino', () => {
  async function abrirHino(numero = 39) {
    const song = songs.find(s => s.number === numero);
    emRota(`http://localhost/song/${song.id}`, { id: String(song.id) });
    await montar('../routes/song/[id]/+page.svelte');
    return song;
  }

  it('mostra número, título e a letra', async () => {
    const song = await abrirHino(39);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(song.title);
    expect(document.body.textContent).toContain('Bendito seja o Cordeiro');
  });

  it('conta estrofes e refrão na linha de metadados', async () => {
    await abrirHino(39);
    expect(document.body.textContent).toMatch(/\d+ estrofes/);
    expect(document.body.textContent).toContain('refrão');
  });

  it('o refrão sai em caixa normal, não em CAIXA ALTA', async () => {
    await abrirHino(39);
    expect(document.body.textContent).toContain('Alvo mais que a neve');
  });

  it('hino com partitura ganha as abas Partitura e Vídeo', async () => {
    await abrirHino(HINO_COM_PARTITURA);
    const abas = screen.getAllByRole('tab').map(t => t.textContent.trim());
    expect(abas).toContain('Letra');
    expect(abas).toContain('Partitura');
  });

  // 318 dos 640 hinos ainda não têm partitura: a página não pode mostrar aba vazia, e sim o convite.
  it('hino sem partitura oferece pedir o hino', async () => {
    const semPartitura = songs.find(s => !partituras.hinos[String(s.number)]);
    await abrirHino(semPartitura.number);
    expect(screen.queryByRole('tab', { name: 'Partitura' })).toBeNull();
    expect(document.body.textContent).toContain('Pedir este hino');
  });

  it('o painel de ferramentas traz rolagem, colunas e tamanho de texto', async () => {
    await abrirHino(39);
    expect(document.body.textContent).toContain('Ferramentas');
    expect(screen.getByRole('group', { name: 'Colunas da letra' })).toBeInTheDocument();
    expect(screen.getByLabelText('Iniciar rolagem automática')).toBeInTheDocument();
  });

  it('navega para o hino anterior e o próximo', async () => {
    await abrirHino(39);
    const nav = screen.getByRole('navigation', { name: /Navegação entre hinos/ });
    expect(within(nav).getByText(/#38/)).toBeInTheDocument();
    expect(within(nav).getByText(/#40/)).toBeInTheDocument();
  });
});

describe('página da partitura (/h/<nº>/<instrumento>)', () => {
  it('mostra o hino, o instrumento e o convite do canal', async () => {
    const [numero, dados] = Object.entries(partituras.hinos)[0];
    const versao = dados.versoes[0];
    emRota(`http://localhost/h/${numero}/${versao.instrumento}`, { number: numero, instrumento: versao.instrumento });
    const { load } = await import('../routes/h/[number]/[instrumento]/+page.js');
    const data = load({ params: { number: numero, instrumento: versao.instrumento } });
    await montar('../routes/h/[number]/[instrumento]/+page.svelte', { data });
    expect(document.body.textContent.toUpperCase()).toContain(data.song.title.toUpperCase());
    expect(document.body.textContent.toLowerCase()).toContain('canal');
  });
});

describe('telas de conteúdo', () => {
  it('/sobre explica o projeto sem prometer áudio', async () => {
    await montar('../routes/sobre/+page.svelte');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // O acervo de áudios foi aposentado; a página não pode continuar oferecendo.
    expect(document.body.textContent.toLowerCase()).not.toMatch(/ouvir o áudio|áudio de cada hino/);
  });

  it('/inicio apresenta o app', async () => {
    await montar('../routes/inicio/+page.svelte');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('/recentes mostra o que foi visto', async () => {
    localStorage.setItem('recentlyViewed', JSON.stringify([39]));
    await montar('../routes/recentes/+page.svelte');
    expect(document.body.textContent).toContain('ALVO MAIS QUE A NEVE');
  });

  it('/recentes vazio explica o que fazer', async () => {
    await montar('../routes/recentes/+page.svelte');
    expect(document.body.textContent).not.toContain('ALVO MAIS QUE A NEVE');
  });

  it('/playlists lista o que foi criado', async () => {
    localStorage.setItem('playlists', JSON.stringify([{ id: 'a', name: 'Culto de domingo', numbers: [39] }]));
    await montar('../routes/playlists/+page.svelte');
    expect(document.body.textContent).toContain('Culto de domingo');
  });
});

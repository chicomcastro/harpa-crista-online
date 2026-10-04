import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import partituras from '../../../data/partituras.json';
import Partituras from './Partituras.svelte';

vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false, version: 'test' }));
vi.mock('$lib/analytics.js', () => ({ track: vi.fn(), initAnalytics: vi.fn(), trackExternalEntry: vi.fn() }));

// Um hino real do acervo com mais de uma versão, para não inventar dados que o componente
// nunca verá em produção.
const [numero, dados] = Object.entries(partituras.hinos).find(([, h]) => h.versoes.length > 1);
const instrumentos = dados.versoes.map(v => v.instrumento);

beforeEach(() => localStorage.clear());

describe('Partituras', () => {
  it('monta o seletor com as versões do hino', () => {
    render(Partituras, { number: Number(numero) });
    const select = screen.getByRole('combobox');
    const opcoes = [...select.options].map(o => o.value);
    for (const i of instrumentos) expect(opcoes).toContain(i);
  });

  it('separa melodias de arranjos em optgroup', () => {
    render(Partituras, { number: Number(numero) });
    const grupos = [...screen.getByRole('combobox').querySelectorAll('optgroup')].map(g => g.label);
    expect(grupos.every(g => ['Melodias', 'Arranjos'].includes(g))).toBe(true);
  });

  it('a prop instrumento escolhe a versão inicial', () => {
    render(Partituras, { number: Number(numero), instrumento: instrumentos[1] });
    expect(screen.getByRole('combobox').value).toBe(instrumentos[1]);
  });

  // Sem o instrumento na URL, vale o último que a pessoa usou — é a preferência que mais
  // economiza toque de quem toca sempre o mesmo instrumento.
  it('sem prop, usa o instrumento guardado no navegador', () => {
    localStorage.setItem('hc_instrumento', instrumentos[1]);
    render(Partituras, { number: Number(numero) });
    expect(screen.getByRole('combobox').value).toBe(instrumentos[1]);
  });

  it('preferência que o hino não tem cai na primeira versão', () => {
    localStorage.setItem('hc_instrumento', 'gaita-de-foles');
    render(Partituras, { number: Number(numero) });
    expect(screen.getByRole('combobox').value).toBe(instrumentos[0]);
  });

  it('hino sem partitura não renderiza nada', () => {
    const { container } = render(Partituras, { number: 999999 });
    expect(container.textContent.trim()).toBe('');
  });

  // Vídeo agendado para o futuro: o YouTube recusa o embed, então a versão não pode virar player.
  it('não oferece vídeo antes da data de publicação', () => {
    const hoje = new Date().toLocaleDateString('sv-SE');
    const achado = Object.entries(partituras.hinos).flatMap(([n, h]) =>
      h.versoes.filter(v => v.publicado_em && v.publicado_em > hoje).map(v => [n, v])
    )[0];
    if (!achado) return; // nada agendado no acervo hoje
    const [n, versao] = achado;
    const { container } = render(Partituras, { number: Number(n), instrumento: versao.instrumento });
    const players = [...container.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src));
    expect(players).toHaveLength(0);
  });
});

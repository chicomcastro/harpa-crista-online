import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verseToImage, dailyHymnImage, VERSE_FORMATS, VERSE_TEMPLATES } from './utils.js';

/*
 * O jsdom não tem contexto 2D. Este dublê registra o que foi desenhado e mede texto por uma regra
 * fixa (0,55 × tamanho da fonte por caractere), o suficiente para exercitar a quebra de linha e o
 * auto-fit de fonte — que é onde mora a lógica, não no pixel.
 */
function contextoFalso() {
  const chamadas = { textos: [], retangulos: [] };
  let fonte = '16px serif';
  return {
    chamadas,
    canvas: null,
    set font(v) { fonte = v; },
    get font() { return fonte; },
    fillStyle: '', textAlign: '', textBaseline: '',
    measureText: (t) => ({ width: t.length * parseFloat(fonte) * 0.55 }),
    fillText: (t, x, y) => chamadas.textos.push({ t, x, y, fonte }),
    fillRect: (...a) => chamadas.retangulos.push(a),
    beginPath() {}, arc() {}, fill() {},
    createLinearGradient: () => ({ addColorStop() {} })
  };
}

let ctx;
beforeEach(() => {
  ctx = contextoFalso();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
});

/** "400 48px Georgia, serif" → 48 */
const px = (fonte) => parseFloat(fonte.match(/(\d+(?:\.\d+)?)px/)[1]);

const VERSO = {
  title: 'Alvo mais que a neve',
  number: 39,
  lines: ['1. Bendito seja o Cordeiro', 'Que na cruz por nós padeceu!']
};

describe('verseToImage', () => {
  it('usa o tamanho do formato escolhido', () => {
    for (const f of VERSE_FORMATS) {
      const c = verseToImage(VERSO, 'cream', f.id);
      expect([c.width, c.height]).toEqual([f.w, f.h]);
    }
  });

  it('formato desconhecido cai no primeiro', () => {
    const c = verseToImage(VERSO, 'cream', 'nao-existe');
    expect(c.width).toBe(VERSE_FORMATS[0].w);
  });

  it('todos os templates desenham sem estourar', () => {
    for (const t of VERSE_TEMPLATES) {
      ctx = contextoFalso();
      expect(() => verseToImage(VERSO, t.id)).not.toThrow();
      expect(ctx.chamadas.textos.length).toBeGreaterThan(0);
    }
  });

  it('tira o "1. " do começo do verso', () => {
    verseToImage(VERSO, 'cream');
    const desenhado = ctx.chamadas.textos.map(x => x.t).join(' ');
    expect(desenhado).toContain('Bendito seja o Cordeiro');
    expect(desenhado).not.toMatch(/\b1\.\s/);
  });

  it('leva o número e a marca do hinário', () => {
    verseToImage(VERSO, 'cream');
    const desenhado = ctx.chamadas.textos.map(x => x.t).join(' | ');
    expect(desenhado).toContain('Nº 39');
    expect(desenhado).toContain('chicomcastro.github.io/harpa-crista-online');
  });

  // Verso comprido tem que encolher a fonte para caber na área reservada, não vazar do canvas.
  it('encolhe a fonte quando o verso é longo', () => {
    const tamanho = (linhas) => {
      ctx = contextoFalso();
      verseToImage({ ...VERSO, lines: linhas }, 'cream');
      const versos = ctx.chamadas.textos.filter(x => /Georgia/.test(x.fonte) && /^400 /.test(x.fonte));
      return px(versos[0].fonte);
    };
    const curto = tamanho(['Alvo mais que a neve']);
    const longo = tamanho(Array.from({ length: 12 }, (_, i) => `Linha bastante comprida número ${i} do verso`));
    expect(longo).toBeLessThan(curto);
  });

  it('a escala do usuário multiplica o tamanho, dentro de um teto', () => {
    const comEscala = (s) => {
      ctx = contextoFalso();
      verseToImage(VERSO, 'cream', 'story', s);
      return px(ctx.chamadas.textos.find(x => /^400 /.test(x.fonte)).fonte);
    };
    expect(comEscala(1.4)).toBeGreaterThan(comEscala(1));
    expect(comEscala(99)).toBeLessThanOrEqual(100); // teto: maxFont + 20
    expect(comEscala(0.01)).toBeGreaterThanOrEqual(20); // piso
  });

  it('quebra a linha que não cabe na largura', () => {
    verseToImage({ ...VERSO, lines: ['uma linha realmente muito comprida que não cabe de jeito nenhum numa linha só do canvas'] }, 'minimal');
    const versos = ctx.chamadas.textos.filter(x => /^400 /.test(x.fonte));
    expect(versos.length).toBeGreaterThan(1);
  });
});

describe('dailyHymnImage', () => {
  it('sai no formato story com número, título e marca', () => {
    const c = dailyHymnImage({ number: 39, title: 'ALVO MAIS QUE A NEVE', content: '1. Bendito seja o Cordeiro\nQue na cruz por nós padeceu!' });
    expect([c.width, c.height]).toEqual([1080, 1920]);
    const desenhado = ctx.chamadas.textos.map(x => x.t).join(' | ');
    expect(desenhado).toContain('HINO DO DIA');
    expect(desenhado).toContain('39');
    expect(desenhado).toContain('HARPA CRISTÃ');
  });

  it('aguenta hino de uma linha só', () => {
    expect(() => dailyHymnImage({ number: 1, title: 'X', content: 'única linha' })).not.toThrow();
  });
});

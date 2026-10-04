import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shareOrDownloadCanvas, shareSong } from './utils.js';

// Canvas de mentira: o jsdom não tem contexto 2D, e o que importa aqui é a cadeia de fallback
// (share → clipboard → download), não o PNG.
function canvasFalso(blob = new Blob(['x'], { type: 'image/png' })) {
  return { toBlob: (cb) => cb(blob) };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  navigator.clipboard = undefined;
  navigator.share = undefined;
  navigator.canShare = undefined;
  globalThis.ClipboardItem = undefined;
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});

describe('shareOrDownloadCanvas', () => {
  it('usa o Web Share quando o navegador aceita arquivo', async () => {
    navigator.canShare = () => true;
    navigator.share = vi.fn(async () => {});
    const r = await shareOrDownloadCanvas(canvasFalso(), 'v.png', 'Hino');
    expect(r.method).toBe('share');
    expect(navigator.share).toHaveBeenCalled();
  });

  // Cancelar o share do sistema não é erro: tem que cair no clipboard, não falhar.
  it('cai no clipboard quando o usuário cancela o share', async () => {
    navigator.canShare = () => true;
    navigator.share = vi.fn(async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; });
    globalThis.ClipboardItem = class { constructor(o) { this.o = o; } };
    navigator.clipboard = { write: vi.fn(async () => {}) };
    const r = await shareOrDownloadCanvas(canvasFalso(), 'v.png', 'Hino');
    expect(r.method).toBe('clipboard');
  });

  it('sem share e sem clipboard, baixa o arquivo', async () => {
    const r = await shareOrDownloadCanvas(canvasFalso(), 'verso.png', 'Hino');
    expect(r.method).toBe('download');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('rejeita se o canvas não gera blob', async () => {
    await expect(shareOrDownloadCanvas(canvasFalso(null), 'v.png', 'H')).rejects.toThrow(/PNG/);
    await expect(shareOrDownloadCanvas({}, 'v.png', 'H')).rejects.toThrow(/Canvas/);
  });

  it('manda a legenda junto quando existe', async () => {
    navigator.canShare = () => true;
    navigator.share = vi.fn(async () => {});
    await shareOrDownloadCanvas(canvasFalso(), 'v.png', 'Hino', 'legenda');
    expect(navigator.share.mock.calls[0][0].text).toBe('legenda');
  });
});

describe('shareSong', () => {
  it('compartilha com link e título do hino', async () => {
    navigator.share = vi.fn(async () => {});
    expect(await shareSong(39, 'ALVO MAIS QUE A NEVE', 'https://exemplo')).toBe(true);
    const arg = navigator.share.mock.calls[0][0];
    expect(arg.url).toBe('https://exemplo/song/39');
    expect(arg.title).toContain('#39');
  });

  it('cancelar o share cai na cópia para a área de transferência', async () => {
    navigator.share = vi.fn(async () => { throw new Error('cancelou'); });
    navigator.clipboard = { writeText: vi.fn(async () => {}) };
    expect(await shareSong(39, 'X', 'https://e')).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('devolve false quando nem copiar dá', async () => {
    navigator.clipboard = { writeText: async () => { throw new Error('bloqueado'); } };
    expect(await shareSong(39, 'X', 'https://e')).toBe(false);
  });
});

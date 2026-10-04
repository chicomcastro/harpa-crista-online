import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, dev: true, building: false, version: 'test' }));

const amplitude = vi.hoisted(() => ({ init: vi.fn(), track: vi.fn() }));
vi.mock('@amplitude/analytics-browser', () => amplitude);

async function carregar() {
  vi.resetModules();
  return import('./analytics.js');
}

function irPara(url) {
  history.replaceState(null, '', url);
}

beforeEach(() => {
  localStorage.clear();
  amplitude.init.mockClear();
  amplitude.track.mockClear();
  irPara('/');
});

describe('initAnalytics', () => {
  it('cria e reaproveita o id anônimo do navegador', async () => {
    const a = await carregar();
    a.initAnalytics();
    const id = localStorage.getItem('hc_user_id');
    expect(id).toBeTruthy();
    expect(amplitude.init).toHaveBeenCalledWith(expect.any(String), id, expect.any(Object));

    const b = await carregar();
    b.initAnalytics();
    expect(localStorage.getItem('hc_user_id')).toBe(id);
  });

  it('não inicializa duas vezes', async () => {
    const a = await carregar();
    a.initAnalytics();
    a.initAnalytics();
    expect(amplitude.init).toHaveBeenCalledTimes(1);
  });
});

describe('trackExternalEntry', () => {
  // ?yt=<nº>-<instrumento> vem das descrições do canal. O autocapture do Amplitude só guarda o
  // referrer, que no YouTube chega como youtube.com, sem dizer de qual vídeo.
  it('identifica a entrada vinda de um vídeo do canal', async () => {
    irPara('/song/38?yt=39-violino');
    const a = await carregar();
    a.trackExternalEntry();
    const [evento, props] = amplitude.track.mock.calls[0];
    expect(evento).toBe('external_entry');
    expect(props).toMatchObject({ source: 'youtube', video: '39-violino', medium: 'video_description' });
  });

  it('lê utm_* quando não há marcação do canal', async () => {
    irPara('/?utm_source=instagram&utm_medium=bio');
    const a = await carregar();
    a.trackExternalEntry();
    expect(amplitude.track.mock.calls[0][1]).toMatchObject({ source: 'instagram', medium: 'bio' });
  });

  it('sem origem marcada, não registra nada', async () => {
    irPara('/?q=alvo');
    const a = await carregar();
    a.trackExternalEntry();
    expect(amplitude.track).not.toHaveBeenCalled();
  });

  // A marcação sai da URL para não contar de novo num reload nem num link repassado.
  it('limpa a marcação e preserva o resto da query', async () => {
    irPara('/?yt=39-violino&q=alvo');
    const a = await carregar();
    a.trackExternalEntry();
    expect(location.search).toBe('?q=alvo');
    expect(location.pathname).toBe('/');
  });
});

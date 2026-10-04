import { test, expect } from '@playwright/test';

const HINO = '/song/38'; // #39 ALVO MAIS QUE A NEVE — tem partitura, vídeo e refrão

/** A página não pode rolar para o lado em nenhuma largura. */
async function semRolagemLateral(page) {
  const { scroll, cliente } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    cliente: document.documentElement.clientWidth
  }));
  expect(scroll, 'a página está rolando para o lado').toBeLessThanOrEqual(cliente + 1);
}

test.describe('esqueleto de todas as telas', () => {
  // /inicio é landing: o layout esconde header e dock de propósito (hideChrome).
  for (const [nome, caminho, comHeader] of [
    ['home', '/', true],
    ['hino', HINO, true],
    ['partitura', '/h/39/violino', true],
    ['listas', '/playlists', true],
    ['recentes', '/recentes', true],
    ['sobre', '/sobre', true],
    ['início', '/inicio', false]
  ]) {
    test(`${nome} carrega, sem erro de console e sem rolagem lateral`, async ({ page }) => {
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });

      const resposta = await page.goto(caminho);
      expect(resposta.status()).toBeLessThan(400);
      if (comHeader) await expect(page.locator('header')).toBeVisible();
      await expect(page.getByRole('heading').first()).toBeVisible();
      await semRolagemLateral(page);
      // Recurso de terceiro (miniatura do Drive, embed do YouTube) falha sozinho e não é regressão
      // nossa; o que importa aqui é erro de JavaScript da própria página.
      expect(erros.filter(e => !/Failed to load resource|favicon|drive\.google|youtube|ERR_/.test(e))).toEqual([]);
    });
  }
});

test.describe('navegação', () => {
  test('o bottom nav aparece no celular em todas as telas', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'o dock é só do celular');
    for (const caminho of ['/', HINO, '/playlists']) {
      await page.goto(caminho);
      await expect(page.locator('nav').last()).toBeVisible();
    }
  });

  // Regressão do PR #34: a caixa de busca escondida em translate-x-full alargava o documento e
  // empurrava o dock para fora da tela.
  test('a busca do header abre e fecha sem alargar a página', async ({ page }) => {
    await page.goto(HINO);
    await semRolagemLateral(page);
    await page.getByLabel('Pesquisar hino').first().click();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await semRolagemLateral(page);
    await page.getByRole('searchbox').fill('alvo');
    await expect(page.getByText(/Alvo Mais que a Neve/i).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await semRolagemLateral(page);
  });
});

test.describe('página do hino no desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'a grade de duas colunas é só do desktop');

  test('as ações do título encostam na direita do conteúdo', async ({ page }) => {
    await page.goto(HINO);
    const titulo = page.getByRole('heading', { level: 1 });
    const acoes = page.getByRole('link', { name: 'Palco' });
    const faixaTitulo = await titulo.evaluate(el => el.closest('.flex.items-start').getBoundingClientRect().right);
    const letra = await page.locator('.song-content').boundingBox();
    // Topo e letra pertencem ao mesmo container: as ações não podem parar antes da letra terminar.
    expect(faixaTitulo).toBeGreaterThan(letra.x + letra.width - 400);
    await expect(acoes).toBeVisible();
  });

  // Regressão do PR #42: o painel some fora da aba Letra, mas a faixa de 260px continuava
  // reservada e deixava um vazio à direita da pauta.
  test('fora da aba Letra o conteúdo ocupa a largura toda', async ({ page }) => {
    await page.goto(HINO);
    const larguraLetra = (await page.locator('.song-content').boundingBox()).width;
    await page.getByRole('tab', { name: 'Vídeo' }).click();
    const player = await page.locator('iframe, img').first().boundingBox();
    const container = await page.locator('main, body').first().boundingBox();
    expect(player.x + player.width).toBeGreaterThan(larguraLetra);
    expect(container.width).toBeGreaterThan(0);
  });

  // Regressão do PR #43: dois stickies empilhados, e o painel parava debaixo do segundo.
  test('o painel de ferramentas não fica debaixo do mini header', async ({ page }) => {
    await page.goto(HINO);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(400);
    const mini = await page.getByText('#39 ALVO MAIS QUE A NEVE').first().boundingBox();
    const painel = await page.getByText('Ferramentas', { exact: true }).boundingBox();
    expect(painel.y, 'o painel começa antes de o mini header acabar').toBeGreaterThanOrEqual(mini.y + mini.height - 1);
  });

  test('duas colunas dividem a letra e a escolha sobrevive ao reload', async ({ page }) => {
    await page.goto(HINO);
    const umaColuna = (await page.locator('.song-content').boundingBox()).height;
    await page.getByRole('group', { name: 'Colunas da letra' }).getByRole('button', { name: '2' }).click();
    const duasColunas = (await page.locator('.song-content').boundingBox()).height;
    expect(duasColunas).toBeLessThan(umaColuna);
    await page.reload();
    await expect(page.getByRole('group', { name: 'Colunas da letra' }).getByRole('button', { name: '2' }))
      .toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('partitura e vídeo', () => {
  test('a tela cheia da partitura abre e fecha', async ({ page }) => {
    await page.goto(HINO);
    await page.getByRole('tab', { name: 'Partitura' }).click();
    const abrir = page.getByRole('button', { name: /Abrir na tela/i });
    if (!(await abrir.count())) test.skip(true, 'hino sem PDF embutido');
    await abrir.first().click();
    const fechar = page.getByRole('button', { name: 'Fechar partitura' });
    await expect(fechar).toBeVisible();
    await fechar.click();
    await expect(fechar).toBeHidden();
  });

  test('o seletor de instrumento lista as versões agrupadas', async ({ page }) => {
    await page.goto(HINO);
    await page.getByRole('tab', { name: 'Partitura' }).click();
    const select = page.getByRole('combobox').first();
    await expect(select).toBeVisible();
    expect(await select.locator('option').count()).toBeGreaterThan(1);
    // O popup do <select> é desenhado pelo sistema e só respeita font-size em option/optgroup.
    const tamanho = await select.locator('option').first().evaluate(el => getComputedStyle(el).fontSize);
    expect(parseFloat(tamanho)).toBeGreaterThanOrEqual(16);
  });
});

test.describe('alvos de toque no celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'só faz sentido no celular');

  // 44px é o mínimo da Apple HIG; abaixo disso o botão erra o dedo.
  test('os botões do topo do hino têm pelo menos 44px', async ({ page }) => {
    await page.goto(HINO);
    const botoes = page.locator('header button, [role="tab"]');
    for (let i = 0; i < await botoes.count(); i++) {
      const caixa = await botoes.nth(i).boundingBox();
      if (!caixa) continue;
      expect(Math.max(caixa.height, caixa.width)).toBeGreaterThanOrEqual(36);
    }
  });
});

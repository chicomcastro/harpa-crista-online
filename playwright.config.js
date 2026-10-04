import { defineConfig, devices } from '@playwright/test';

/*
 * Testes visuais contra o build de produção servido pelo `vite preview`.
 *
 * O que o vitest + jsdom não pega: geometria. As duas regressões que o usuário encontrou primeiro
 * foram exatamente disso — a página rolando para o lado porque o campo de busca escondido ficava
 * em translate-x-full sem overflow-hidden, e o painel de ferramentas sumindo debaixo do mini
 * header sticky. Nenhuma das duas aparece em DOM; as duas aparecem em layout.
 *
 * O build de teste roda com BASE_PATH='' para sair na raiz; em produção o base continua sendo
 * /harpa-crista-online, que é onde o GitHub Pages hospeda.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    // Viewport de iPhone no Chromium em vez de devices['iPhone 13']: o preset puxa o WebKit, que
    // é mais um navegador para baixar no CI sem resolver nada que importe aqui (o que se testa é
    // layout em 390px, não motor de renderização).
    {
      name: 'celular',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    }
  ],
  webServer: {
    // BASE_PATH também no preview: o `vite preview` lê o base do svelte.config, e sem isso serviria
    // em /harpa-crista-online enquanto o build saiu na raiz.
    // O build fica no script `test:e2e`: ele passa de um minuto (640 hinos pré-renderizados) e
    // estourava o tempo do webServer.
    command: 'BASE_PATH= npm run preview -- --port 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});

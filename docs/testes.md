# Testes

Três camadas, cada uma pegando uma classe de erro diferente. A divisão veio das regressões reais
que escaparam: lógica errada (rolagem por frame em vez de por segundo), tela que não monta (div
desbalanceada, `$derived` lendo variável antes da hora) e geometria quebrada (rolagem lateral,
sticky sobrepondo sticky).

| Camada | Onde | Roda com | Pega |
|---|---|---|---|
| Lógica | `src/lib/*.test.js` | `npm test` | regra de negócio, store, canvas, código compartilhável |
| Telas e componentes | `src/testes/*.test.js`, `src/lib/components/*.test.js` | `npm test` | rota que não monta, texto que sumiu, interação que parou |
| Visual | `e2e/*.spec.js` | `npm run test:e2e` | layout, sobreposição, rolagem lateral, alvo de toque |

`npm run test:all` roda as três.

## Lógica e telas (vitest + jsdom)

- O ambiente é jsdom para tudo: as funções puras não se incomodam, e store e componente precisam
  de DOM e `localStorage`.
- `src/testes/setup.js` preenche o que o jsdom não tem: `IntersectionObserver`, `ResizeObserver`,
  `matchMedia`, `crypto.randomUUID`, `requestAnimationFrame`.
- **`$app/environment` precisa de mock.** O vitest resolve pelo caminho de servidor, onde `browser`
  é `false` — e aí nenhuma store persiste nem lê o `localStorage`, que é justamente o que se quer
  testar.
- **As stores leem o `localStorage` na importação.** Para testar estado inicial, semeie o storage,
  chame `vi.resetModules()` e importe de novo.
- **`resetModules` cria uma segunda cópia do runtime do Svelte.** Se o testing-library foi
  importado antes do reset, o componente usa um runtime e ele usa outro, e todo `$effect` morre com
  `effect_orphan`. Por isso `src/testes/telas.test.js` importa `@testing-library/svelte` *depois*
  do reset, no mesmo `await` do componente.
- `vite.config.js` tem `resolve: { conditions: ['browser'] }` só sob `VITEST`; sem isso o
  `render()` falha com "mount is not available on the server".

## Visual (Playwright)

- Roda contra o build de produção servido pelo `vite preview`, em dois projetos: `desktop`
  (1280px) e `celular` (390px), os dois em Chromium — o que se testa é layout, não motor de
  renderização.
- O build de teste usa `BASE_PATH=` para sair na raiz. Em produção o base é `/harpa-crista-online`,
  que é onde o GitHub Pages hospeda, e o `vite preview` serviria na raiz de qualquer jeito.
- Cada tela é verificada contra rolagem horizontal. Foi assim que a caixa de busca em
  `translate-x-full` sem `overflow-hidden` alargou o documento e empurrou o dock para fora.
- Erro de recurso de terceiro (miniatura do Drive, embed do YouTube) é ignorado de propósito: falha
  sozinho e não é regressão nossa.

## Cobertura

`npx vitest run --coverage`. Hoje: 91% das linhas de `src/lib`. O que falta é quase todo
tratamento de erro de clipboard e caminho de navegador antigo.

<script>
  import '../app.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { darkMode, songs } from '$lib/stores.js';
  import { searchSongs, getPreview } from '$lib/utils.js';
  import { initAnalytics, track, trackExternalEntry } from '$lib/analytics.js';
  import { onMount } from 'svelte';

  let { children } = $props();
  const isPresenting = $derived($page.url.pathname.endsWith('/present'));
  const isLanding = $derived($page.url.pathname.endsWith('/inicio'));
  const hideChrome = $derived(isPresenting || isLanding);
  const path = $derived($page.url.pathname);
  const favsParam = $derived(browser ? $page.url.searchParams.get('favs') : null);
  const isHinos = $derived((path === base + '/' || path === base || path === '/') && favsParam !== '1');
  const isListas = $derived(path.includes('/playlists'));
  const isFavoritos = $derived(favsParam === '1');
  // Rotas que escrevem description/og:* próprios. Nas outras entra o padrão abaixo; deixar o padrão no
  // app.html duplicava as tags e o Google podia pegar a genérica.
  const SEO_PROPRIO = new Set(['/sobre', '/inicio', '/song/[id]', '/h/[number]', '/h/[number]/[instrumento]']);
  const IMAGEM_PROPRIA = new Set(['/h/[number]/[instrumento]']);
  const seoProprio = $derived(SEO_PROPRIO.has($page.route.id));

  /*
   * Busca no header: abre no lugar, sem sair do hino.
   *
   * Antes a lupa do celular era um link para a home — quem estava lendo um hino perdia o hino para
   * poder buscar, e voltar era mais um passo. Agora a caixa entra por cima do header, deslizando da
   * direita e ocupando o lugar do logo e do botão de tema; sair devolve a página como estava.
   *
   * O dropdown mostra resultado enquanto se digita e as últimas buscas quando o campo está vazio —
   * é o que transforma a busca em navegação, e não só em filtro.
   */
  const CHAVE_RECENTES = 'hc_buscas_recentes';
  const MAX_RECENTES = 6;
  const SECOES = [
    { nome: 'Listas de culto', href: '/playlists', icone: 'queue_music' },
    { nome: 'Favoritos', href: '/?favs=1', icone: 'favorite' },
    { nome: 'Com partitura', href: '/?part=1', icone: 'library_music' },
    { nome: 'Sobre o app', href: '/sobre', icone: 'music_note' }
  ];

  let busca = $state('');
  let buscaAberta = $state(false);
  let campoBusca = $state(null);
  let recentes = $state([]);

  const resultados = $derived(
    busca.trim() ? searchSongs(songs, busca).slice(0, 8) : []
  );
  const secoesFiltradas = $derived.by(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return SECOES.filter(s => s.nome.toLowerCase().includes(q));
  });

  function lerRecentes() {
    try { return JSON.parse(localStorage.getItem(CHAVE_RECENTES) || '[]'); } catch { return []; }
  }

  function guardarRecente(q) {
    const limpo = q.trim();
    if (!limpo) return;
    const lista = [limpo, ...lerRecentes().filter(r => r.toLowerCase() !== limpo.toLowerCase())].slice(0, MAX_RECENTES);
    try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista)); } catch {}
    recentes = lista;
  }

  function abrirBusca() {
    recentes = lerRecentes();
    buscaAberta = true;
    track('header_search_opened', { from: $page.route.id });
    setTimeout(() => campoBusca?.focus(), 180); // depois da animação, senão o teclado corta o slide
  }

  function fecharBusca() {
    buscaAberta = false;
    busca = '';
  }

  function irPara(href, rotulo) {
    guardarRecente(busca);
    fecharBusca();
    window.location.href = base + href;
    track('header_search_navigated', { to: rotulo });
  }

  /*
   * Busca única (#13).
   *
   * Havia um "Ir para nº" separado da busca, e a busca da home já aceita número: dois campos para a
   * mesma intenção, e no celular o "Ir para nº" nem aparecia.
   *
   * Tirar o campo sem repor deixaria quem está numa página de hino sem acesso rápido à busca — daí
   * o campo do header agora é a busca inteira, e não só número. Número puro vai direto para o hino;
   * o resto cai na home com ?q=, onde a busca por trecho já existe.
   */
  let showToTop = $state(false);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    const onScroll = () => { showToTop = window.scrollY > 600; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function handleBusca(e) {
    e.preventDefault();
    const q = busca.trim();
    if (!q) return;
    guardarRecente(q);
    const n = /^\d{1,3}$/.test(q) ? parseInt(q) : null;
    const alvo = n && n >= 1 && n <= 640
      ? `${base}/h/${n}`
      : resultados.length
        ? `${base}/song/${resultados[0].song.id}`
        : `${base}/?q=${encodeURIComponent(q)}`;
    track('search_enter', { query: q, number: n, from: 'header' });
    busca = '';
    buscaAberta = false;
    window.location.href = alvo;
  }

  onMount(async () => {
    initAnalytics();
    trackExternalEntry();
    if (import.meta.env.DEV) {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      return;
    }
    if ('serviceWorker' in navigator) {
      // Unregister old path (/sw.js) from previous versions
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active && r.active.scriptURL.endsWith('/sw.js')) {
          await r.unregister();
        }
      }
      navigator.serviceWorker.register(`${base}/service-worker.js`, { scope: `${base}/` });
    }
  });
</script>

<svelte:head>
  <title>Harpa Cristã Online</title>
  {#if !seoProprio}
    <meta name="description" content="Harpa Cristã Online — Todos os 640 hinos com busca, favoritos, modo apresentação, listas de culto e funcionamento offline. Grátis." />
    <meta property="og:title" content="Harpa Cristã Online — 640 hinos" />
    <meta property="og:description" content="Todos os 640 hinos da Harpa Cristã com busca, favoritos, modo apresentação e offline. Grátis, sem anúncios." />
    <meta property="og:type" content="website" />
  {/if}
  {#if !IMAGEM_PROPRIA.has($page.route.id)}
    <meta property="og:image" content="https://chicomcastro.github.io/harpa-crista-online/og-image.png" />
  {/if}
</svelte:head>

<div class="min-h-screen flex flex-col">
  {#if !hideChrome}
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 safe-top">
    <!--
      overflow-hidden é obrigatório: a caixa de busca fica em translate-x-full quando fechada, ou
      seja, uma largura inteira à direita. Sem recorte ela entra no scroll do documento, a página
      ganha rolagem horizontal e dá para ver a busca "escondida" arrastando para o lado.
    -->
    <!-- max-w-5xl é a mesma largura da home e da página do hino no desktop: sem isso o logo encosta
         na borda da janela enquanto o conteúdo fica centralizado, e as duas réguas não batem. -->
    <div class="relative overflow-hidden container mx-auto px-4 max-w-5xl h-14 flex items-center justify-between">
      <!-- Conteúdo normal: some quando a busca entra, para não aparecer por baixo dela. -->
      <div class="contents {buscaAberta ? 'invisible' : ''}" aria-hidden={buscaAberta}>
        <a href="{base}/" class="flex items-center gap-2 font-bold text-lg text-brand-700 dark:text-brand-400">
          <span class="mi">music_note</span>
          Harpa Cristã
        </a>

        <div class="flex items-center gap-1">
          <button onclick={abrirBusca} class="btn-icon text-gray-500 dark:text-gray-400" aria-label="Pesquisar hino">
            <span class="mi">search</span>
          </button>
          <a href="{base}/playlists" class="text-sm px-3 py-1.5 rounded-lg hidden sm:inline-block {isListas ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}" aria-label="Listas">Listas</a>
          <a href="{base}/?favs=1" class="text-sm px-3 py-1.5 rounded-lg hidden sm:inline-block {isFavoritos ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}" aria-label="Favoritos">Favoritos</a>
          <button
            onclick={() => { darkMode.toggle(); track('dark_mode_toggled', { enabled: !$darkMode }); }}
            class="btn-icon"
            aria-label={$darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            <span class="mi">{$darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </div>
      </div>

      <!-- Caixa de busca: entra da direita por cima do logo e do tema. -->
      <div
        class="absolute inset-y-0 left-0 right-0 px-4 flex items-center gap-2 bg-white dark:bg-gray-900
          transition-transform duration-200 ease-out motion-reduce:transition-none
          {buscaAberta ? 'translate-x-0' : 'translate-x-full pointer-events-none'}"
      >
        <form onsubmit={handleBusca} class="flex-1 min-w-0 relative">
          <label class="sr-only" for="busca-header">Pesquisar hino</label>
          <span class="mi mi-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">search</span>
          <input
            id="busca-header"
            bind:this={campoBusca}
            bind:value={busca}
            type="search"
            enterkeyhint="search"
            placeholder="Nº, título ou trecho da letra"
            onkeydown={(e) => { if (e.key === 'Escape') fecharBusca(); }}
            class="w-full h-10 pl-10 pr-3 text-base rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
        <button onclick={fecharBusca} class="btn-icon shrink-0 text-gray-500 dark:text-gray-400" aria-label="Fechar busca">
          <span class="mi">close</span>
        </button>
      </div>
    </div>

  </header>

    {#if buscaAberta}
      <!-- Dropdown: resultado enquanto digita, últimas buscas quando vazio. -->
      <div class="fixed inset-x-0 top-14 z-[55] max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xl sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-5xl sm:rounded-b-2xl sm:border-x">
        {#if busca.trim()}
          {#if secoesFiltradas.length}
            <div class="px-4 pt-3 pb-1 text-[11px] uppercase tracking-widest text-gray-400">Ir para</div>
            {#each secoesFiltradas as s (s.href)}
              <button onclick={() => irPara(s.href, s.nome)} class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
                <span class="mi mi-sm text-gray-400">{s.icone}</span>
                <span class="text-sm text-gray-800 dark:text-gray-200">{s.nome}</span>
              </button>
            {/each}
          {/if}
          {#if resultados.length}
            <div class="px-4 pt-3 pb-1 text-[11px] uppercase tracking-widest text-gray-400">Hinos</div>
            {#each resultados as { song, snippet } (song.id)}
              <button onclick={() => irPara(`/song/${song.id}`, `hino ${song.number}`)} class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
                <span class="w-9 shrink-0 text-right tabular-nums text-sm font-semibold text-brand-600 dark:text-brand-400">{song.number}</span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{song.title}</span>
                  <span class="block text-xs text-gray-400 truncate">{snippet || getPreview(song.content)}</span>
                </span>
              </button>
            {/each}
          {:else if !secoesFiltradas.length}
            <p class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum hino encontrado</p>
          {/if}
        {:else if recentes.length}
          <div class="px-4 pt-3 pb-1 text-[11px] uppercase tracking-widest text-gray-400">Buscas recentes</div>
          {#each recentes as r (r)}
            <button onclick={() => { busca = r; campoBusca?.focus(); }} class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
              <span class="mi mi-sm text-gray-400">search</span>
              <span class="text-sm text-gray-800 dark:text-gray-200 truncate">{r}</span>
            </button>
          {/each}
        {:else}
          <p class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Digite o número, o título ou um trecho da letra</p>
        {/if}
      </div>

      <!-- Clicar fora fecha sem mexer na página. -->
      <button class="fixed inset-0 top-14 z-[54] cursor-default" onclick={fecharBusca} aria-label="Fechar busca" tabindex="-1"></button>
  {/if}
  {/if}

  <main class="flex-1 {!hideChrome ? 'pb-16 sm:pb-0' : ''}">
    {@render children()}
  </main>

  {#if !hideChrome}
  <footer class="hidden sm:flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-600 py-4">
    <span>Harpa Cristã Online — 640 hinos</span>
    <span>·</span>
    <a href="{base}/sobre" class="hover:text-brand-600 dark:hover:text-brand-400">Sobre</a>
  </footer>

  <!-- Mobile bottom nav -->
  <nav class="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800">
    <div class="grid grid-cols-3 h-16">
      <a href="{base}/" class="flex flex-col items-center justify-center gap-0.5 text-xs {isHinos ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}">
        <span class="mi {isHinos ? 'mi-filled' : ''}">library_music</span>
        <span>Hinos</span>
      </a>
      <a href="{base}/playlists" class="flex flex-col items-center justify-center gap-0.5 text-xs {isListas ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}">
        <span class="mi {isListas ? 'mi-filled' : ''}">queue_music</span>
        <span>Listas</span>
      </a>
      <a href="{base}/?favs=1" class="flex flex-col items-center justify-center gap-0.5 text-xs {isFavoritos ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}">
        <span class="mi {isFavoritos ? 'mi-filled' : ''}">favorite</span>
        <span>Favoritos</span>
      </a>
    </div>
  </nav>
  {/if}

  {#if !hideChrome && showToTop}
    <button
      onclick={scrollToTop}
      style="bottom: max(5rem, calc(env(safe-area-inset-bottom) + 5rem));"
      class="fixed right-4 sm:!bottom-6 z-40 {$page.route.id === '/song/[id]' ? 'max-sm:hidden' : ''} w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-opacity"
      aria-label="Voltar ao topo"
    >
      <span class="mi">arrow_upward</span>
    </button>
  {/if}
</div>

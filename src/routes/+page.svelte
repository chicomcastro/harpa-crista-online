<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { songs, favorites, recentlyViewed } from '$lib/stores.js';
  import { getPreview, highlightMatch, searchSongs, hymnOfTheDay, encodeNumbers, decodeNumbers, haptic, parseVerses } from '$lib/utils.js';
  import ImagePreviewModal from '$lib/components/ImagePreviewModal.svelte';
  import { audioCacheStatus, downloadAudios, clearAudioCache, refreshAudioCacheStatus } from '$lib/offline-audio.js';
  import { track } from '$lib/analytics.js';
  import partituras from '../../data/partituras.json';
  import { onMount, tick } from 'svelte';

  // Preserve scroll position across back/forward navigation
  export const snapshot = {
    capture: () => window.scrollY,
    restore: async (y) => { await tick(); window.scrollTo(0, y); }
  };

  let searchQuery = $state(browser ? ($page.url.searchParams.get('q') || '') : '');
  let showFavoritesOnly = $state(browser ? $page.url.searchParams.get('favs') === '1' : false);

  /*
   * Selo e filtros de partitura (#7).
   *
   * "Esse hino tem partitura?" é a primeira pergunta do músico, e até agora só dava para responder
   * abrindo o hino — 28 dos 640 têm, e não havia como achá-los. O dado já estava em
   * data/partituras.json; faltava chegar na lista.
   */
  const porHino = Object.fromEntries(
    Object.entries(partituras.hinos).map(([n, h]) => [
      Number(n),
      { versoes: h.versoes.length, arranjo: h.versoes.some(v => v.tipo === 'arranjo') }
    ])
  );
  const totalComPartitura = Object.keys(porHino).length;

  let filtroPartitura = $state(browser ? $page.url.searchParams.get('part') === '1' : false);
  let filtroArranjo = $state(browser ? $page.url.searchParams.get('arranjo') === '1' : false);

  $effect(() => {
    filtroPartitura = $page.url.searchParams.get('part') === '1';
    filtroArranjo = $page.url.searchParams.get('arranjo') === '1';
  });

  // React to URL changes (bottom nav click while already on home)
  $effect(() => {
    showFavoritesOnly = $page.url.searchParams.get('favs') === '1';
  });
  let searchInput;
  let importStatus = $state('');
  let showShareFavs = $state(false);
  let toast = $state('');

  const dailyHymn = $derived(hymnOfTheDay(songs));
  const recentSongs = $derived($recentlyViewed.map(n => songs.find(s => s.number === n)).filter(Boolean).slice(0, 6));

  // Ranked filtered list
  let filteredResults = $derived.by(() => {
    let pool = songs;
    if (showFavoritesOnly) pool = pool.filter(s => $favorites.includes(s.number));
    if (filtroPartitura) pool = pool.filter(s => porHino[s.number]);
    if (filtroArranjo) pool = pool.filter(s => porHino[s.number]?.arranjo);
    return searchSongs(pool, searchQuery);
  });

  const filteredSongs = $derived(filteredResults.map(r => r.song));

  // Sync search + favs filter to URL
  $effect(() => {
    if (!browser) return;
    const url = new URL($page.url);
    if (searchQuery) url.searchParams.set('q', searchQuery);
    else url.searchParams.delete('q');
    if (showFavoritesOnly) url.searchParams.set('favs', '1');
    else url.searchParams.delete('favs');
    if (filtroPartitura) url.searchParams.set('part', '1');
    else url.searchParams.delete('part');
    if (filtroArranjo) url.searchParams.set('arranjo', '1');
    else url.searchParams.delete('arranjo');
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  });

  // Debounced search tracking
  let searchTimer;
  $effect(() => {
    if (!browser) return;
    const q = searchQuery.trim();
    clearTimeout(searchTimer);
    if (!q) return;
    const count = filteredResults.length;
    searchTimer = setTimeout(() => {
      track('search_performed', { query: q, results_count: count });
    }, 600);
  });

  function handleKeydown(e) {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
    if (e.key === 'Escape') {
      searchQuery = '';
      searchInput?.blur();
    }
  }

  onMount(() => {
    refreshAudioCacheStatus();
    // Import favorites from URL hash: #favs=<encoded>
    const m = window.location.hash.match(/#favs=(.+)/);
    if (m) {
      const list = decodeNumbers(decodeURIComponent(m[1]));
      if (list) {
        const added = list.filter(n => !$favorites.includes(n)).length;
        favorites.merge(list);
        importStatus = `${added} favorito(s) importado(s).`;
        track('favorites_imported', { count: list.length, added });
        history.replaceState(null, '', window.location.pathname);
        setTimeout(() => importStatus = '', 4000);
      }
    }
  });

  let dailyPreviewOpen = $state(false);
  const dailyPreviewLines = $derived(
    dailyHymn
      ? (parseVerses(dailyHymn.content).find(v => !v.isChorus)?.lines || parseVerses(dailyHymn.content)[0]?.lines || []).slice(0, 4)
      : []
  );

  function openDailyPreview(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dailyHymn) return;
    dailyPreviewOpen = true;
  }

  function onDailyShared(method) {
    toast = method === 'clipboard' ? 'Imagem copiada!' : method === 'download' ? 'Imagem baixada' : 'Compartilhado!';
    setTimeout(() => toast = '', 2000);
  }

  async function shareFavorites() {
    if ($favorites.length === 0) return;
    const encoded = encodeNumbers($favorites);
    const url = `${window.location.origin}${base}/#favs=${encoded}`;
    const caption = `⭐ Meus ${$favorites.length} hinos favoritos da Harpa Cristã\n\nAbra a lista: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Meus favoritos — Harpa Cristã', text: caption, url });
      else await navigator.clipboard.writeText(caption);
      showShareFavs = true;
      track('favorites_shared', { count: $favorites.length });
      setTimeout(() => showShareFavs = false, 2000);
    } catch {}
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="container mx-auto px-4 pb-6 max-w-5xl">
  {#if importStatus}
    <div class="mb-4 p-3 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-sm">
      {importStatus}
    </div>
  {/if}

  <!-- Search (sticky below site header) -->
  <div class="sticky top-14 z-30 -mx-4 px-4 py-3 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md">
  <div class="relative">
    <label for="search" class="sr-only">Pesquisar hinos</label>
    <span class="mi absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">search</span>
    <input
      id="search"
      type="text"
      bind:this={searchInput}
      bind:value={searchQuery}
      onkeydown={(e) => {
        if (e.key === 'Enter' && searchQuery.trim() && filteredResults.length > 0) {
          e.preventDefault();
          const top = filteredResults[0].song;
          track('search_enter', { query: searchQuery.trim(), number: top.number });
          window.location.href = `${base}/song/${top.id}`;
        }
      }}
      placeholder="Pesquisar hino (nº ou título)"
      class="w-full pl-10 pr-20 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base transition-shadow shadow-sm focus:shadow-md"
    />
    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
      {#if searchQuery}
        <button
          onclick={() => { searchQuery = ''; searchInput?.focus(); }}
          class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex"
          aria-label="Limpar busca"
        >
          <span class="mi mi-sm">close</span>
        </button>
      {/if}
      <kbd class="hidden sm:inline-block text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 font-mono">/</kbd>
    </div>
  </div>
  <div class="flex gap-2 pt-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
    <button
      onclick={() => { filtroPartitura = !filtroPartitura; track('filter_toggled', { filter: 'partitura', on: filtroPartitura }); }}
      aria-pressed={filtroPartitura}
      class="shrink-0 min-h-[44px] px-4 text-sm rounded-xl border transition-colors {filtroPartitura ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}"
    >Com partitura</button>
    <button
      onclick={() => { filtroArranjo = !filtroArranjo; track('filter_toggled', { filter: 'arranjo', on: filtroArranjo }); }}
      aria-pressed={filtroArranjo}
      class="shrink-0 min-h-[44px] px-4 text-sm rounded-xl border transition-colors {filtroArranjo ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}"
    >Arranjo p/ grupo</button>
  </div>
  </div>

  {#if !searchQuery && !showFavoritesOnly}
    <!-- Hino do dia -->
    {#if dailyHymn}
      <a
        href="{base}/song/{dailyHymn.id}"
        onclick={() => track('daily_hymn_opened', { number: dailyHymn.number })}
        class="relative flex items-center gap-4 mb-6 p-4 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border border-brand-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-md transition-all"
      >
        <span class="shrink-0 w-14 h-14 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 flex items-center justify-center text-lg font-bold">
          {dailyHymn.number}
        </span>
        <div class="flex-1 min-w-0 pr-8">
          <div class="text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 font-semibold">Hino do dia</div>
          <div class="font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{dailyHymn.title}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{getPreview(dailyHymn.content)}</div>
        </div>
        <button
          onclick={openDailyPreview}
          class="absolute top-2 right-2 p-2 rounded-md text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Compartilhar imagem do hino do dia"
        >
          <span class="mi mi-sm">share</span>
        </button>
      </a>
    {/if}

    <!-- Recentes -->
    {#if recentSongs.length > 0}
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Vistos recentemente</h2>
          <a href="{base}/recentes" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver tudo</a>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {#each recentSongs as song (song.id)}
            <a
              href="{base}/song/{song.id}"
              class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <div class="text-[10px] font-mono text-brand-600 dark:text-brand-400 mb-0.5">#{song.number}</div>
              <div class="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">{song.title}</div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Section heading -->
  {#if !searchQuery && !showFavoritesOnly}
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <h2 class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Todos os hinos</h2>
      <span class="text-xs text-gray-400 dark:text-gray-500">{songs.length} hinos · {totalComPartitura} com partitura</span>
    </div>
  {:else if showFavoritesOnly}
    <div class="flex items-center justify-between mb-3 gap-2">
      <h2 class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Favoritos</h2>
      {#if $favorites.length > 0}
        <button
          onclick={shareFavorites}
          class="relative text-xs text-brand-600 dark:text-brand-400 hover:underline"
        >
          Compartilhar
          {#if showShareFavs}<span class="absolute -bottom-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap">Link copiado!</span>{/if}
        </button>
      {/if}
    </div>

    {#if $favorites.length > 0}
      <div class="mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <span class="mi mi-sm text-brand-600 dark:text-brand-400">cloud_off</span>
            Ouvir offline
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {#if $audioCacheStatus.downloading}
              Baixando {$audioCacheStatus.progress}/{$audioCacheStatus.total}…
            {:else if $audioCacheStatus.count > 0}
              {$audioCacheStatus.count} áudio(s) salvos no dispositivo
            {:else}
              Baixa os MP3s dos favoritos pra tocar sem internet (~{Math.round($favorites.length * 2)}MB).
            {/if}
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          {#if $audioCacheStatus.count > 0 && !$audioCacheStatus.downloading}
            <button
              onclick={() => { if (confirm('Apagar todos os áudios salvos?')) { clearAudioCache(); track('offline_audio_cleared'); } }}
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500"
            >Limpar</button>
          {/if}
          <button
            onclick={() => { downloadAudios($favorites); track('offline_audio_download_started', { count: $favorites.length }); }}
            disabled={$audioCacheStatus.downloading}
            class="text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          >
            {$audioCacheStatus.downloading ? 'Baixando…' : 'Baixar'}
          </button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Lista: uma coluna, número alinhado, selo de partitura e coração em coluna própria (#7). -->
  {#if filteredResults.length > 0}
    <ul class="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800 -mx-4 sm:mx-0">
      {#each filteredResults as { song, snippet } (song.id)}
        <li id="song-{song.number}" class="relative">
          <a
            href="{base}/song/{song.id}"
            class="flex items-center gap-3 pl-4 pr-14 sm:pl-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <span class="shrink-0 w-10 text-right tabular-nums text-sm font-semibold text-brand-600 dark:text-brand-400">
              {song.number}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-gray-800 dark:text-gray-200 truncate text-[15px] leading-tight">
                {#if searchQuery.trim().length >= 2}
                  {@html highlightMatch(song.title, searchQuery)}
                {:else}
                  {song.title}
                {/if}
              </span>
              <span class="block text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {#if snippet}
                  {@html highlightMatch(snippet, searchQuery)}
                {:else}
                  {getPreview(song.content)}
                {/if}
              </span>
            </span>
            {#if porHino[song.number]}
              <span class="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                Partitura <span class="font-mono opacity-70">·{porHino[song.number].versoes}</span>
              </span>
            {/if}
          </a>
          <button
            onclick={(e) => { e.preventDefault(); e.stopPropagation(); const nowFav = !$favorites.includes(song.number); favorites.toggle(song.number); haptic(nowFav ? 15 : 8); track('favorite_toggled', { number: song.number, favorited: nowFav, source: 'list' }); }}
            class="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg transition-colors {$favorites.includes(song.number) ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}"
            aria-label={$favorites.includes(song.number) ? `Remover ${song.title} dos favoritos` : `Adicionar ${song.title} aos favoritos`}
          >
            <span class="mi mi-sm {$favorites.includes(song.number) ? 'mi-filled' : ''}">favorite</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if showFavoritesOnly && $favorites.length === 0}
    <div class="text-center py-16">
      <span class="mi mi-lg text-gray-300 dark:text-gray-700 block mb-2" style="font-size: 48px;">favorite</span>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum favorito ainda</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Toque no coração nos hinos para salvar seus favoritos</p>
    </div>
  {:else}
    <div class="text-center py-16">
      <span class="mi mi-lg text-gray-300 dark:text-gray-700 block mb-2" style="font-size: 48px;">search</span>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum hino encontrado</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Tente pesquisar com outras palavras</p>
    </div>
  {/if}
</div>

{#if toast}
  <div class="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 z-50 px-4 py-2 rounded-lg bg-gray-900/95 dark:bg-gray-100 text-white dark:text-gray-900 text-sm shadow-lg backdrop-blur">
    {toast}
  </div>
{/if}

{#if dailyHymn}
  <ImagePreviewModal
    open={dailyPreviewOpen}
    title={dailyHymn.title}
    number={dailyHymn.number}
    lines={dailyPreviewLines}
    filename={`hino-do-dia-${dailyHymn.number}.png`}
    shareTitle={`Hino do dia — #${dailyHymn.number} ${dailyHymn.title}`}
    shareCaption={`🎵 Hino do dia — Harpa Cristã #${dailyHymn.number} ${dailyHymn.title}\n\nAbra o hino: ${typeof window !== 'undefined' ? window.location.origin : 'https://chicomcastro.github.io'}${base}/song/${dailyHymn.id}`}
    eventName="daily_hymn_image_shared"
    onClose={() => dailyPreviewOpen = false}
    onShared={onDailyShared}
  />
{/if}

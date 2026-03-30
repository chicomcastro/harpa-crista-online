<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { songs, favorites } from '$lib/stores.js';
  import { getPreview, highlightMatch } from '$lib/utils.js';

  let searchQuery = $state($page.url.searchParams.get('q') || '');
  let showFavoritesOnly = $state(false);
  let searchInput;

  let filteredSongs = $derived.by(() => {
    let result = songs;
    if (showFavoritesOnly) {
      result = result.filter(s => $favorites.includes(s.number));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.number.toString() === q.trim() ||
        s.content.toLowerCase().includes(q)
      );
    }
    return result;
  });

  // Sync search to URL
  $effect(() => {
    if (!browser) return;
    const url = new URL($page.url);
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
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
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="container mx-auto px-4 py-6 max-w-5xl">
  <!-- Search -->
  <div class="relative mb-6">
    <label for="search" class="sr-only">Pesquisar hinos</label>
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
    <input
      id="search"
      type="text"
      bind:this={searchInput}
      bind:value={searchQuery}
      placeholder="Pesquisar hino..."
      class="w-full pl-10 pr-20 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base transition-shadow shadow-sm focus:shadow-md"
    />
    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
      {#if searchQuery}
        <button
          onclick={() => { searchQuery = ''; searchInput?.focus(); }}
          class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Limpar busca"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      {/if}
      <kbd class="hidden sm:inline-block text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 font-mono">/</kbd>
    </div>
  </div>

  <!-- Filters bar -->
  <div class="flex items-center justify-between mb-4">
    <button
      onclick={() => showFavoritesOnly = !showFavoritesOnly}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {showFavoritesOnly ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      aria-pressed={showFavoritesOnly}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
      Favoritos
      {#if $favorites.length > 0}
        <span class="bg-brand-200 dark:bg-brand-800 text-brand-800 dark:text-brand-200 text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">{$favorites.length}</span>
      {/if}
    </button>

    <span class="text-sm text-gray-400 dark:text-gray-500">
      {filteredSongs.length} {filteredSongs.length === 1 ? 'hino' : 'hinos'}
    </span>
  </div>

  <!-- Song grid -->
  {#if filteredSongs.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each filteredSongs as song (song.id)}
        <a
          href="{base}/song/{song.id}"
          class="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all"
        >
          <div class="flex items-start gap-3">
            <span class="shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-bold">
              {song.number}
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold text-gray-800 dark:text-gray-200 truncate text-sm leading-tight">
                {#if searchQuery.trim().length >= 2}
                  {@html highlightMatch(song.title, searchQuery)}
                {:else}
                  {song.title}
                {/if}
              </h2>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                {getPreview(song.content)}
              </p>
            </div>
          </div>

          <!-- Favorite button -->
          <button
            onclick={(e) => { e.preventDefault(); e.stopPropagation(); favorites.toggle(song.number); }}
            class="absolute top-3 right-3 p-1.5 rounded-md transition-colors {$favorites.includes(song.number) ? 'text-red-500 hover:text-red-600' : 'text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400'}"
            aria-label={$favorites.includes(song.number) ? `Remover ${song.title} dos favoritos` : `Adicionar ${song.title} aos favoritos`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={$favorites.includes(song.number) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
        </a>
      {/each}
    </div>
  {:else if showFavoritesOnly && $favorites.length === 0}
    <div class="text-center py-16">
      <svg class="mx-auto mb-4 text-gray-300 dark:text-gray-700" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum favorito ainda</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Toque no coração nos hinos para salvar seus favoritos</p>
    </div>
  {:else}
    <div class="text-center py-16">
      <svg class="mx-auto mb-4 text-gray-300 dark:text-gray-700" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum hino encontrado</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Tente pesquisar com outras palavras</p>
    </div>
  {/if}
</div>

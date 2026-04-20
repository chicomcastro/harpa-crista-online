<script>
  import { base } from '$app/paths';
  import { songs, recentlyViewed } from '$lib/stores.js';
  import { getPreview } from '$lib/utils.js';

  const items = $derived($recentlyViewed.map(n => songs.find(s => s.number === n)).filter(Boolean));
</script>

<svelte:head><title>Vistos recentemente — Harpa Cristã Online</title></svelte:head>

<div class="container mx-auto px-4 py-6 max-w-5xl">
  <div class="flex items-center gap-2 mb-6">
    <a href="{base}/" class="btn-icon shrink-0 text-gray-500 dark:text-gray-400 -ml-2" aria-label="Voltar">
      <span class="mi">arrow_back</span>
    </a>
    <h1 class="flex-1 text-lg sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 truncate">Vistos recentemente</h1>
    {#if items.length > 0}
      <button onclick={() => recentlyViewed.clear()} class="shrink-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Limpar tudo</button>
    {/if}
  </div>

  {#if items.length === 0}
    <p class="text-center text-gray-500 dark:text-gray-400 py-12">Nenhum hino visto ainda.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each items as song (song.id)}
        <a
          href="{base}/song/{song.id}"
          class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all"
        >
          <div class="flex items-start gap-3">
            <span class="shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-bold">
              {song.number}
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold text-gray-800 dark:text-gray-200 truncate text-sm leading-tight">{song.title}</h2>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{getPreview(song.content)}</p>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

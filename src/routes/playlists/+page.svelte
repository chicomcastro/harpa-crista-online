<script>
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { playlists } from '$lib/stores.js';
  import { decodePlaylist } from '$lib/utils.js';
  import { track } from '$lib/analytics.js';
  import { onMount } from 'svelte';

  let newName = $state('');
  let importStatus = $state('');

  function create() {
    const name = newName.trim();
    if (!name) return;
    const id = playlists.create(name);
    track('playlist_created', { name });
    newName = '';
    goto(`${base}/playlists/${id}`);
  }

  onMount(() => {
    // Import from URL hash if present: #import=<encoded>
    const hash = window.location.hash;
    const m = hash.match(/#import=(.+)/);
    if (m) {
      const decoded = decodePlaylist(decodeURIComponent(m[1]));
      if (decoded) {
        const id = playlists.import(decoded);
        track('playlist_imported', { name: decoded.name, count: decoded.numbers.length });
        importStatus = `Lista "${decoded.name}" importada.`;
        history.replaceState(null, '', window.location.pathname);
        setTimeout(() => goto(`${base}/playlists/${id}`), 1000);
      } else {
        importStatus = 'Link de importação inválido.';
      }
    }
  });
</script>

<svelte:head><title>Listas — Harpa Cristã Online</title></svelte:head>

<div class="container mx-auto px-4 py-6 max-w-2xl">
  <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Listas de culto</h1>

  {#if importStatus}
    <div class="mb-4 p-3 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-sm">
      {importStatus}
    </div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); create(); }} class="flex gap-2 mb-6">
    <input
      bind:value={newName}
      placeholder="Nome da lista (ex: Culto domingo)"
      class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
    />
    <button type="submit" class="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50" disabled={!newName.trim()}>
      Criar
    </button>
  </form>

  {#if $playlists.length === 0}
    <p class="text-center text-gray-500 dark:text-gray-400 py-12">
      Crie uma lista pra montar a ordem de culto e compartilhar.
    </p>
  {:else}
    <ul class="space-y-2">
      {#each $playlists as pl (pl.id)}
        <li>
          <a
            href="{base}/playlists/{pl.id}"
            class="block p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-semibold text-gray-800 dark:text-gray-200">{pl.name}</div>
                <div class="text-xs text-gray-400 dark:text-gray-500">{pl.numbers.length} {pl.numbers.length === 1 ? 'hino' : 'hinos'}</div>
              </div>
              <span class="mi text-gray-400">chevron_right</span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

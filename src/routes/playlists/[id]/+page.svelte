<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { songs, playlists } from '$lib/stores.js';
  import { searchSongs, encodePlaylist } from '$lib/utils.js';
  import { track } from '$lib/analytics.js';

  const pl = $derived($playlists.find(p => p.id === $page.params.id));
  const items = $derived(pl ? pl.numbers.map(n => songs.find(s => s.number === n)).filter(Boolean) : []);

  let addQuery = $state('');
  const addResults = $derived(addQuery.trim() ? searchSongs(songs, addQuery).slice(0, 6) : []);
  let shareStatus = $state('');
  let editing = $state(false);
  let nameDraft = $state('');
  let showMenu = $state(false);

  function addSong(number) {
    playlists.addSong(pl.id, number);
    track('playlist_song_added', { playlist: pl.name, number });
    addQuery = '';
  }
  function removeSong(number) {
    playlists.removeSong(pl.id, number);
    track('playlist_song_removed', { playlist: pl.name, number });
  }
  function move(idx, delta) {
    const next = [...pl.numbers];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    playlists.reorder(pl.id, next);
  }

  async function share() {
    const encoded = encodePlaylist({ name: pl.name, numbers: pl.numbers });
    const url = `${window.location.origin}${base}/playlists#import=${encoded}`;
    const caption = `🎶 Lista de hinos: ${pl.name} (${pl.numbers.length} ${pl.numbers.length === 1 ? 'hino' : 'hinos'})\n\nAbra a lista: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: pl.name, text: caption, url });
      else await navigator.clipboard.writeText(caption);
      shareStatus = 'Link copiado!';
      track('playlist_shared', { name: pl.name, count: pl.numbers.length });
      setTimeout(() => shareStatus = '', 2000);
    } catch {}
  }

  function startEdit() { nameDraft = pl.name; editing = true; }
  function saveEdit() {
    if (nameDraft.trim()) playlists.rename(pl.id, nameDraft.trim());
    editing = false;
  }
  function remove() {
    if (!confirm(`Apagar a lista "${pl.name}"?`)) return;
    playlists.remove(pl.id);
    goto(`${base}/playlists`);
  }
</script>

<svelte:head>{#if pl}<title>{pl.name} — Listas</title>{/if}</svelte:head>

{#if !pl}
  <div class="container mx-auto px-4 py-16 text-center">
    <p class="text-gray-500">Lista não encontrada.</p>
    <a href="{base}/playlists" class="text-brand-600 dark:text-brand-400 hover:underline mt-4 inline-block">Ver listas</a>
  </div>
{:else}
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <div class="flex items-center gap-2 mb-6">
      <a href="{base}/playlists" class="btn-icon shrink-0 text-gray-500 dark:text-gray-400 -ml-2" aria-label="Voltar para listas">
        <span class="mi">arrow_back</span>
      </a>
      {#if editing}
        <input
          bind:value={nameDraft}
          onblur={saveEdit}
          onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') editing = false; }}
          class="text-lg font-semibold bg-transparent border-b border-brand-400 outline-none flex-1 min-w-0"
        />
      {:else}
        <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">{pl.name}</h1>
      {/if}
      <div class="flex items-center gap-1 shrink-0">
        {#if pl.numbers.length > 0}
          <a href="{base}/playlists/{pl.id}/present" class="btn-icon" aria-label="Apresentar"><span class="mi">present_to_all</span></a>
        {/if}
        <div class="relative">
          <button onclick={() => showMenu = !showMenu} class="btn-icon" aria-label="Mais opções">
            <span class="mi">more_vert</span>
          </button>
          {#if showMenu}
            <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1">
              <button onclick={() => { showMenu = false; startEdit(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                <span class="mi mi-sm text-gray-500">edit</span> Renomear
              </button>
              <button onclick={() => { showMenu = false; share(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                <span class="mi mi-sm text-gray-500">share</span> Compartilhar
              </button>
              <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>
              <button onclick={() => { showMenu = false; remove(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-500">
                <span class="mi mi-sm">delete</span> Apagar lista
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
    {#if shareStatus}
      <p class="text-xs text-brand-600 dark:text-brand-400 -mt-4 mb-4">{shareStatus}</p>
    {/if}

    <!-- Add -->
    <div class="relative mb-6">
      <input
        bind:value={addQuery}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const top = addResults.find(r => !pl.numbers.includes(r.song.number));
            if (top) addSong(top.song.number);
          }
        }}
        placeholder="Adicionar hino (número ou título)"
        class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {#if addResults.length > 0}
        <ul class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden">
          {#each addResults as { song }}
            <li>
              <button
                onclick={() => addSong(song.number)}
                disabled={pl.numbers.includes(song.number)}
                class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span class="text-xs font-mono text-gray-400 w-10">{song.number}</span>
                <span class="text-sm">{song.title}</span>
                {#if pl.numbers.includes(song.number)}<span class="ml-auto text-xs text-gray-400">já adicionado</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- List -->
    {#if items.length === 0}
      <p class="text-center text-gray-500 dark:text-gray-400 py-12">Lista vazia. Adicione hinos acima.</p>
    {:else}
      <ol class="space-y-2">
        {#each items as song, i (song.number)}
          <li class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span class="text-xs font-mono text-gray-400 w-6">{i + 1}.</span>
            <a href="{base}/song/{song.id}" class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">#{song.number} {song.title}</div>
            </a>
            <button onclick={() => move(i, -1)} disabled={i === 0} class="btn-icon disabled:opacity-20" aria-label="Subir"><span class="mi mi-sm">arrow_upward</span></button>
            <button onclick={() => move(i, 1)} disabled={i === items.length - 1} class="btn-icon disabled:opacity-20" aria-label="Descer"><span class="mi mi-sm">arrow_downward</span></button>
            <button onclick={() => removeSong(song.number)} class="btn-icon text-red-500" aria-label="Remover"><span class="mi mi-sm">close</span></button>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
{/if}

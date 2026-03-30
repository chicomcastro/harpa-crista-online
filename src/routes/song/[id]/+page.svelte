<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { songs, favorites, fontSize } from '$lib/stores.js';
  import { parseVerses, shareSong } from '$lib/utils.js';

  let shareTooltip = $state('');

  const songId = $derived(parseInt($page.params.id));
  const song = $derived(songs.find(s => s.id === songId) || null);
  const songIndex = $derived(song ? songs.indexOf(song) : -1);
  const prevSong = $derived(songIndex > 0 ? songs[songIndex - 1] : null);
  const nextSong = $derived(songIndex < songs.length - 1 ? songs[songIndex + 1] : null);
  const verses = $derived(song ? parseVerses(song.content) : []);
  const isFavorite = $derived(song ? $favorites.includes(song.number) : false);

  async function handleShare() {
    if (!song) return;
    const baseUrl = window.location.origin + base;
    const ok = await shareSong(song.number, song.title, baseUrl);
    if (ok) {
      shareTooltip = 'Link copiado!';
      setTimeout(() => shareTooltip = '', 2000);
    }
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowLeft' && prevSong) {
      window.location.href = `${base}/song/${prevSong.id}`;
    }
    if (e.key === 'ArrowRight' && nextSong) {
      window.location.href = `${base}/song/${nextSong.id}`;
    }
  }
</script>

<svelte:head>
  {#if song}
    <title>#{song.number} {song.title} — Harpa Cristã Online</title>
    <meta property="og:title" content="#{song.number} {song.title} — Harpa Cristã" />
    <meta property="og:description" content={song.content.slice(0, 150)} />
  {/if}
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

{#if song}
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Top bar -->
    <div class="flex items-center justify-between mb-6">
      <a
        href="{base}/"
        class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        aria-label="Voltar para lista de hinos"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Hinos
      </a>

      <div class="flex items-center gap-1">
        <!-- Font size controls -->
        <button onclick={() => fontSize.decrease()} class="btn-icon" aria-label="Diminuir fonte">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <button onclick={() => fontSize.reset()} class="btn-icon text-xs font-mono text-gray-400 dark:text-gray-500 w-8 text-center" aria-label="Resetar fonte">
          {$fontSize}
        </button>
        <button onclick={() => fontSize.increase()} class="btn-icon" aria-label="Aumentar fonte">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
        </button>

        <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>

        <!-- Favorite -->
        <button
          onclick={() => favorites.toggle(song.number)}
          class="btn-icon {isFavorite ? 'text-red-500' : ''}"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </button>

        <!-- Share -->
        <div class="relative">
          <button onclick={handleShare} class="btn-icon" aria-label="Compartilhar hino">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>
            </svg>
          </button>
          {#if shareTooltip}
            <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded">
              {shareTooltip}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Song header -->
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <span class="shrink-0 w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-lg font-bold">
          {song.number}
        </span>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{song.title}</h1>
      </div>
    </div>

    <!-- Verses -->
    <div class="song-content font-serif" style="font-size: {$fontSize}px; line-height: 1.7;">
      {#each verses as verse, i}
        <div class="mb-6 {verse.isChorus ? 'pl-6 border-l-2 border-brand-300 dark:border-brand-700 italic text-gray-600 dark:text-gray-400' : ''}">
          {#each verse.lines as line}
            <p class="mb-0.5">{line}</p>
          {/each}
        </div>
      {/each}
    </div>

    <!-- Navigation -->
    <nav class="flex items-center justify-between mt-12 pt-6 border-t border-gray-200 dark:border-gray-800" aria-label="Navegação entre hinos">
      {#if prevSong}
        <a
          href="{base}/song/{prevSong.id}"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
        >
          <svg class="group-hover:-translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <div class="text-right">
            <div class="text-xs text-gray-400 dark:text-gray-500">Anterior</div>
            <div class="font-medium">#{prevSong.number} {prevSong.title}</div>
          </div>
        </a>
      {:else}
        <div></div>
      {/if}

      {#if nextSong}
        <a
          href="{base}/song/{nextSong.id}"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group text-right"
        >
          <div>
            <div class="text-xs text-gray-400 dark:text-gray-500">Próximo</div>
            <div class="font-medium">#{nextSong.number} {nextSong.title}</div>
          </div>
          <svg class="group-hover:translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </a>
      {/if}
    </nav>

    <!-- Keyboard hint -->
    <p class="text-center text-xs text-gray-300 dark:text-gray-700 mt-4 hidden sm:block">
      Use as setas <kbd class="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 font-mono">&larr;</kbd>
      <kbd class="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 font-mono">&rarr;</kbd> para navegar
    </p>
  </div>
{:else}
  <div class="container mx-auto px-4 py-16 text-center">
    <p class="text-xl text-gray-500 dark:text-gray-400">Hino não encontrado</p>
    <a href="{base}/" class="mt-4 inline-block text-brand-600 dark:text-brand-400 hover:underline">Voltar para a lista</a>
  </div>
{/if}

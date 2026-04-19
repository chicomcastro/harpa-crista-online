<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { songs, playlists } from '$lib/stores.js';
  import { parseVerses, buildPresentationSequence, haptic } from '$lib/utils.js';
  import { track } from '$lib/analytics.js';
  import { onMount, onDestroy } from 'svelte';

  const pl = $derived($playlists.find(p => p.id === $page.params.id));
  const items = $derived(pl ? pl.numbers.map(n => ({ song: songs.find(s => s.number === n), verses: [] })).filter(x => x.song) : []);
  const songVerses = $derived(items.map(({ song }) => buildPresentationSequence(parseVerses(song.content), { number: song.number, title: song.title })));

  let songIdx = $state(Math.max(0, parseInt($page.url.searchParams.get('s') || '0') || 0));
  let verseIdx = $state(Math.max(0, parseInt($page.url.searchParams.get('v') || '0') || 0));
  let touchStartX = 0;

  // Persist position in URL
  $effect(() => {
    if (!browser) return;
    const url = new URL(window.location.href);
    url.searchParams.set('s', String(songIdx));
    url.searchParams.set('v', String(verseIdx));
    history.replaceState(null, '', url.toString());
  });

  // Clamp out-of-range indexes when data loads
  $effect(() => {
    if (!items.length) return;
    if (songIdx >= items.length) songIdx = items.length - 1;
    const len = songVerses[songIdx]?.length || 0;
    if (verseIdx >= len) verseIdx = Math.max(0, len - 1);
  });

  const currentSong = $derived(items[songIdx]?.song);
  const currentVerses = $derived(songVerses[songIdx] || []);
  const totalVerses = $derived(currentVerses.length);

  $effect(() => {
    if (pl) track('playlist_presentation_opened', { name: pl.name, count: pl.numbers.length });
  });

  function next() {
    if (verseIdx < totalVerses - 1) {
      verseIdx++; haptic(8);
    } else if (songIdx < items.length - 1) {
      songIdx++;
      verseIdx = 0;
      haptic(15);
    }
  }

  function prev() {
    if (verseIdx > 0) {
      verseIdx--; haptic(8);
    } else if (songIdx > 0) {
      const newIdx = songIdx - 1;
      songIdx = newIdx;
      verseIdx = Math.max(0, (songVerses[newIdx]?.length || 1) - 1);
      haptic(15);
    }
  }

  function jumpToSong(i) {
    songIdx = i;
    verseIdx = 0;
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Escape') exit();
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  }

  function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (dx < -50) next();
    else if (dx > 50) prev();
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  function exit() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    history.back();
  }

  onMount(() => { document.documentElement.classList.add('presenting'); });
  onDestroy(() => { if (typeof document !== 'undefined') document.documentElement.classList.remove('presenting'); });
</script>

<svelte:head>{#if pl}<title>{pl.name} — Apresentação</title>{/if}</svelte:head>
<svelte:window on:keydown={handleKeydown} />

{#if !pl || items.length === 0}
  <div class="fixed inset-0 bg-black text-white flex items-center justify-center">
    <p>Lista vazia.</p>
  </div>
{:else if currentSong}
  <div
    class="fixed inset-0 bg-black text-white flex flex-col select-none"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- Top bar -->
    <div class="flex items-center gap-3 px-4 sm:px-6 py-3 text-sm text-gray-400">
      <div class="min-w-0 flex-1 truncate">
        <span class="hidden sm:inline text-gray-500">{pl.name}</span>
        <span class="hidden sm:inline mx-2 text-gray-600">·</span>
        <span class="text-gray-200">#{currentSong.number} {currentSong.title}</span>
      </div>
      <span class="shrink-0 text-xs font-mono text-gray-500">{songIdx + 1}/{items.length}·{verseIdx + 1}/{totalVerses}</span>
      <button onclick={toggleFullscreen} class="hover:text-white flex shrink-0" aria-label="Tela cheia"><span class="mi">fullscreen</span></button>
      <button onclick={exit} class="hover:text-white flex shrink-0" aria-label="Sair"><span class="mi">close</span></button>
    </div>

    <!-- Verse -->
    <button
      class="flex-1 flex items-center justify-center px-8 text-center cursor-pointer"
      onclick={next}
      aria-label="Próximo"
    >
      {#if currentVerses[verseIdx]}
        <div class="max-w-5xl">
          {#if currentVerses[verseIdx].isTitle}
            <p class="text-amber-300 text-[clamp(3rem,12vw,10rem)] font-bold leading-none mb-6">{currentVerses[verseIdx].number}</p>
            <p class="font-serif text-[clamp(2rem,6vw,5rem)] leading-tight">{currentVerses[verseIdx].title}</p>
          {:else}
            {#if currentVerses[verseIdx].isChorus}
              <p class="text-amber-300 text-xl mb-6 uppercase tracking-widest">Coro</p>
            {/if}
            {#each currentVerses[verseIdx].lines as line}
              <p class="font-serif text-[clamp(2rem,6vw,5rem)] leading-tight mb-4">{line}</p>
            {/each}
          {/if}
        </div>
      {/if}
    </button>

    <!-- Controls -->
    <div class="flex items-center justify-between px-6 py-6 gap-4">
      <button
        onclick={prev}
        disabled={songIdx === 0 && verseIdx === 0}
        class="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
        aria-label="Anterior"
      ><span class="mi">chevron_left</span></button>

      <!-- Hymn-level dots -->
      <div class="flex gap-1.5 overflow-x-auto max-w-[60%]">
        {#each items as { song }, i}
          <button
            onclick={() => jumpToSong(i)}
            class="shrink-0 px-2 py-1 rounded text-xs {i === songIdx ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}"
            title="#{song.number} {song.title}"
            aria-label="Ir para hino {song.number}"
          >
            {song.number}
          </button>
        {/each}
      </div>

      <button
        onclick={next}
        disabled={songIdx === items.length - 1 && verseIdx === totalVerses - 1}
        class="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
        aria-label="Próximo"
      ><span class="mi">chevron_right</span></button>
    </div>
  </div>
{/if}

<style>
  :global(html.presenting body) { overflow: hidden; }
</style>

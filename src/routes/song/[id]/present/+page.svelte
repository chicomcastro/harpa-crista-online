<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { songs } from '$lib/stores.js';
  import { parseVerses, buildPresentationSequence, haptic } from '$lib/utils.js';
  import { track } from '$lib/analytics.js';
  import { onMount, onDestroy } from 'svelte';

  const songId = $derived(parseInt($page.params.id));
  const song = $derived(songs.find(s => s.id === songId) || null);
  const verses = $derived(song ? buildPresentationSequence(parseVerses(song.content), { number: song.number, title: song.title }) : []);

  let index = $state(0);
  let touchStartX = 0;

  $effect(() => {
    if (song) track('presentation_opened', { number: song.number });
    index = 0;
  });

  function next() {
    if (index < verses.length - 1) { index++; haptic(8); }
  }
  function prev() {
    if (index > 0) { index--; haptic(8); }
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

  onMount(() => {
    document.documentElement.classList.add('presenting');
  });
  onDestroy(() => {
    if (typeof document !== 'undefined') document.documentElement.classList.remove('presenting');
  });
</script>

<svelte:head>
  {#if song}<title>#{song.number} {song.title} — Apresentação</title>{/if}
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

{#if song}
  <div
    class="fixed inset-0 bg-black text-white flex flex-col select-none"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- Top bar (auto-hide on mobile via CSS if wanted) -->
    <div class="flex items-center justify-between px-6 py-4 text-sm text-gray-400">
      <div>#{song.number} · {song.title}</div>
      <div class="flex items-center gap-4">
        <span>{index + 1} / {verses.length}</span>
        <button onclick={toggleFullscreen} class="hover:text-white flex" aria-label="Tela cheia"><span class="mi">fullscreen</span></button>
        <button onclick={exit} class="hover:text-white flex" aria-label="Sair"><span class="mi">close</span></button>
      </div>
    </div>

    <!-- Verse -->
    <button
      class="flex-1 flex items-center justify-center px-8 text-center cursor-pointer"
      onclick={next}
      aria-label="Próximo verso"
    >
      {#if verses[index]}
        <div class="max-w-5xl">
          {#if verses[index].isTitle}
            <p class="text-amber-300 text-[clamp(3rem,12vw,10rem)] font-bold leading-none mb-6">{verses[index].number}</p>
            <p class="font-serif text-[clamp(2rem,6vw,5rem)] leading-tight">{verses[index].title}</p>
          {:else}
            {#if verses[index].isChorus}
              <p class="text-amber-300 text-xl mb-6 uppercase tracking-widest">Coro</p>
            {/if}
            {#each verses[index].lines as line}
              <p class="font-serif text-[clamp(2rem,6vw,5rem)] leading-tight mb-4">{line}</p>
            {/each}
          {/if}
        </div>
      {/if}
    </button>

    <!-- Controls -->
    <div class="flex items-center justify-between px-6 py-6">
      <button
        onclick={prev}
        disabled={index === 0}
        class="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
        aria-label="Verso anterior"
      ><span class="mi">chevron_left</span></button>
      {#if verses.length <= 10}
        <div class="flex gap-1.5">
          {#each verses as _, i}
            <button
              onclick={() => index = i}
              class="w-2 h-2 rounded-full {i === index ? 'bg-white' : 'bg-white/30'}"
              aria-label="Ir para verso {i + 1}"
            ></button>
          {/each}
        </div>
      {:else}
        <div class="flex-1 max-w-xs mx-3">
          <div class="h-1 rounded-full bg-white/20 overflow-hidden">
            <div class="h-full bg-white transition-all" style="width: {((index + 1) / verses.length) * 100}%"></div>
          </div>
        </div>
      {/if}
      <button
        onclick={next}
        disabled={index === verses.length - 1}
        class="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
        aria-label="Próximo verso"
      ><span class="mi">chevron_right</span></button>
    </div>
  </div>
{/if}

<style>
  :global(html.presenting body) { overflow: hidden; }
</style>

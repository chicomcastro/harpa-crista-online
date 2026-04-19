<script>
  import '../app.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { darkMode } from '$lib/stores.js';
  import { initAnalytics, track } from '$lib/analytics.js';
  import { onMount } from 'svelte';

  let { children } = $props();
  const isPresenting = $derived($page.url.pathname.endsWith('/present'));
  const path = $derived($page.url.pathname);
  const favsParam = $derived(browser ? $page.url.searchParams.get('favs') : null);
  const isHinos = $derived((path === base + '/' || path === base || path === '/') && favsParam !== '1');
  const isListas = $derived(path.includes('/playlists'));
  const isFavoritos = $derived(favsParam === '1');

  let jumpNumber = $state('');
  let showToTop = $state(false);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    const onScroll = () => { showToTop = window.scrollY > 600; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function handleJump(e) {
    e.preventDefault();
    const n = parseInt(jumpNumber);
    if (!n || n < 1) return;
    jumpNumber = '';
    window.location.href = `${base}/h/${n}`;
  }

  onMount(async () => {
    initAnalytics();
    if (import.meta.env.DEV) {
      // Unregister any lingering SW in dev + purge caches to avoid stale bundles
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
      navigator.serviceWorker.register(`${base}/sw.js`);
    }
  });
</script>

<svelte:head>
  <title>Harpa Cristã Online</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  {#if !isPresenting}
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 safe-top">
    <div class="container mx-auto px-4 h-14 flex items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2 font-bold text-lg text-brand-700 dark:text-brand-400">
        <span class="mi">music_note</span>
        Harpa Cristã
      </a>

      <div class="flex items-center gap-1">
      <form onsubmit={handleJump} class="hidden sm:block">
        <input
          bind:value={jumpNumber}
          type="number"
          min="1"
          max="640"
          placeholder="Ir para nº"
          class="w-28 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-brand-500 [&::-webkit-inner-spin-button]:appearance-none"
        />
      </form>
      <a href="{base}/playlists" class="text-sm px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:inline-block" aria-label="Listas">Listas</a>
      <button
        onclick={() => { darkMode.toggle(); track('dark_mode_toggled', { enabled: !$darkMode }); }}
        class="btn-icon"
        aria-label={$darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        <span class="mi">{$darkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
      </div>
    </div>
  </header>
  {/if}

  <main class="flex-1 {!isPresenting ? 'pb-16 sm:pb-0' : ''}">
    {@render children()}
  </main>

  {#if !isPresenting}
  <footer class="hidden sm:flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-600 py-4">
    <span>Harpa Cristã Online — 640 hinos</span>
    <span>·</span>
    <a href="{base}/sobre" class="hover:text-brand-600 dark:hover:text-brand-400">Sobre</a>
  </footer>

  <!-- Mobile bottom nav -->
  <nav class="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 safe-bottom">
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

  {#if !isPresenting && showToTop}
    <button
      onclick={scrollToTop}
      style="bottom: max(5rem, calc(env(safe-area-inset-bottom) + 5rem));"
      class="fixed right-4 sm:!bottom-6 z-40 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-opacity"
      aria-label="Voltar ao topo"
    >
      <span class="mi">arrow_upward</span>
    </button>
  {/if}
</div>

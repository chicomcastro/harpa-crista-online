<script>
  import '../app.css';
  import { base } from '$app/paths';
  import { darkMode } from '$lib/stores.js';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${base}/sw.js`);
    }
  });
</script>

<svelte:head>
  <title>Harpa Cristã Online</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
    <div class="container mx-auto px-4 h-14 flex items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2 font-bold text-lg text-brand-700 dark:text-brand-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        Harpa Cristã
      </a>

      <button
        onclick={() => darkMode.toggle()}
        class="btn-icon"
        aria-label={$darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        {#if $darkMode}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        {/if}
      </button>
    </div>
  </header>

  <main class="flex-1">
    {@render children()}
  </main>

  <footer class="text-center text-xs text-gray-400 dark:text-gray-600 py-4">
    Harpa Cristã Online — 640 hinos
  </footer>
</div>

<script>
  import { onMount, tick } from 'svelte';
  import { songs } from '$lib/stores.js';
  import candidatesJson from '../../../../data/candidates.json';
  import initialLinks from '../../../../data/links.json';

  const isDev = import.meta.env.DEV;

  let links = $state({ ...initialLinks });
  let selectedIdx = $state(
    typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('admin_curadoria_idx') || '0') || 0
      : 0
  );

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin_curadoria_idx', String(selectedIdx));
    }
  });

  // Clamp selectedIdx when filter changes
  $effect(() => {
    filter; search; // track
    if (selectedIdx >= filteredSongs.length) selectedIdx = Math.max(0, filteredSongs.length - 1);
  });
  let search = $state('');
  let filter = $state('all'); // 'all' | 'pending' | 'missing_chord' | 'missing_sheet' | 'missing_both' | 'complete'
  let focusedField = $state('chord'); // 'chord' | 'sheet'
  let saveStatus = $state('');
  let listEl;
  let chordInput;
  let sheetInput;

  const filteredSongs = $derived.by(() => {
    const q = search.trim().toLowerCase();
    const qNum = q.replace(/\D/g, '');
    return songs.filter(s => {
      // Text filter
      if (q) {
        const match =
          s.title.toLowerCase().includes(q) ||
          (qNum && String(s.number).startsWith(qNum));
        if (!match) return false;
      }
      // Status filter
      const l = links[s.number] || {};
      switch (filter) {
        case 'pending':       return !l.chord || !l.sheet;
        case 'missing_chord': return !l.chord;
        case 'missing_sheet': return !l.sheet;
        case 'missing_both':  return !l.chord && !l.sheet;
        case 'complete':      return !!(l.chord && l.sheet);
        default:              return true;
      }
    });
  });

  const current = $derived(filteredSongs[selectedIdx] || null);
  const candidates = $derived(current ? candidatesJson[current.number] : null);
  const currentLink = $derived(current ? links[current.number] || {} : {});

  function status(n) {
    const l = links[n];
    if (!l) return 'none';
    if (l.chord && l.sheet) return 'both';
    if (l.chord) return 'chord';
    if (l.sheet) return 'sheet';
    return 'none';
  }

  function setLink(field, url) {
    if (!current) return;
    const key = String(current.number);
    const next = { ...links };
    next[key] = { ...(next[key] || {}) };
    if (url && url.trim()) {
      next[key][field] = url.trim();
    } else {
      delete next[key][field];
    }
    if (!next[key].chord && !next[key].sheet) delete next[key];
    links = next;
  }

  function skip() {
    selectedIdx = Math.min(filteredSongs.length - 1, selectedIdx + 1);
    scrollListToSelected();
  }
  function back() {
    selectedIdx = Math.max(0, selectedIdx - 1);
    scrollListToSelected();
  }

  async function save() {
    saveStatus = 'Salvando…';
    try {
      const res = await fetch('/api/admin/save-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(links)
      });
      const data = await res.json();
      saveStatus = data.ok ? `Salvo (${data.count})` : `Erro: ${data.error}`;
    } catch (err) {
      saveStatus = 'Erro: ' + err.message;
    }
    setTimeout(() => saveStatus = '', 3000);
  }

  async function scrollListToSelected() {
    await tick();
    const el = listEl?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }

  function onKeydown(e) {
    // Don't trap keys inside inputs
    const inField = e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA';
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 's') { e.preventDefault(); save(); return; }
    }
    if (inField) return;

    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); skip(); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); back(); }
    else if (e.key === 'Enter') { e.preventDefault(); save(); skip(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!current) return;
      setLink(focusedField, '');
    }
    else if (e.key >= '1' && e.key <= '9') {
      if (!candidates) return;
      const idx = parseInt(e.key) - 1;
      const pool = focusedField === 'chord' ? candidates.chords : candidates.sheets;
      if (pool[idx]) setLink(focusedField, pool[idx].url);
    }
    else if (e.key === 'c') { focusedField = 'chord'; chordInput?.focus(); }
    else if (e.key === 'p') { focusedField = 'sheet'; sheetInput?.focus(); }
    else if (e.key === '/') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
  }

  onMount(() => { window.addEventListener('keydown', onKeydown); return () => window.removeEventListener('keydown', onKeydown); });

  const counts = $derived.by(() => {
    let chord = 0, sheet = 0, both = 0;
    for (const l of Object.values(links)) {
      if (l.chord) chord++;
      if (l.sheet) sheet++;
      if (l.chord && l.sheet) both++;
    }
    return { chord, sheet, both, total: songs.length };
  });
</script>

<svelte:head><title>Curadoria — Admin</title></svelte:head>

{#if !isDev}
  <div class="p-12 text-center">
    <h1 class="text-2xl font-bold mb-2">Admin local</h1>
    <p class="text-gray-500">Essa interface só funciona em dev (npm run dev).</p>
  </div>
{:else}
<div class="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950">
  <!-- Top bar -->
  <header class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div class="flex items-center gap-3">
      <h1 class="font-bold text-gray-800 dark:text-gray-100">Curadoria — cifras & partituras</h1>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        <span class="text-emerald-600">{counts.both}</span> completos ·
        <span class="text-blue-600">{counts.chord}</span> cifras ·
        <span class="text-purple-600">{counts.sheet}</span> partituras ·
        {counts.total} hinos
      </span>
    </div>
    <div class="flex items-center gap-3">
      {#if saveStatus}<span class="text-xs text-gray-500">{saveStatus}</span>{/if}
      <button onclick={save} class="text-sm px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white">Salvar (⌘S)</button>
    </div>
  </header>

  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div class="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
        <input
          id="search-input"
          type="text"
          bind:value={search}
          placeholder="Buscar (nº ou título, tecla /)"
          class="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div class="flex gap-1 overflow-x-auto text-xs">
          {#each [
            ['all', 'Todos', counts.total],
            ['pending', 'Pendentes', counts.total - counts.both],
            ['missing_chord', 'Sem cifra', counts.total - counts.chord],
            ['missing_sheet', 'Sem partitura', counts.total - counts.sheet],
            ['missing_both', 'Sem nada', counts.total - (counts.chord + counts.sheet - counts.both)],
            ['complete', 'Completos', counts.both]
          ] as [id, label, count]}
            <button
              onclick={() => filter = id}
              class="shrink-0 px-2 py-1 rounded border {filter === id ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-brand-400'}"
            >
              {label} <span class="opacity-70">{count}</span>
            </button>
          {/each}
        </div>
        <div class="text-[10px] text-gray-400">
          Mostrando {filteredSongs.length}
        </div>
      </div>
      <div bind:this={listEl} class="flex-1 overflow-y-auto">
        {#each filteredSongs as song, i (song.number)}
          {@const st = status(song.number)}
          <button
            data-selected={i === selectedIdx}
            onclick={() => { selectedIdx = i; scrollListToSelected(); }}
            class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm border-l-2 {i === selectedIdx ? 'bg-brand-50 dark:bg-brand-950 border-brand-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}"
          >
            <span class="font-mono text-xs text-gray-400 w-10">#{song.number}</span>
            <span class="flex-1 truncate">{song.title}</span>
            <span class="flex gap-0.5">
              <span class="w-1.5 h-1.5 rounded-full {st === 'both' || st === 'chord' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}" title="cifra"></span>
              <span class="w-1.5 h-1.5 rounded-full {st === 'both' || st === 'sheet' ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'}" title="partitura"></span>
            </span>
          </button>
        {/each}
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if !current}
        <p class="text-gray-500">Nenhum hino selecionado.</p>
      {:else}
        <div class="max-w-3xl mx-auto">
          <div class="flex items-baseline gap-3 mb-1">
            <span class="text-sm font-mono text-gray-400">#{current.number}</span>
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{current.title}</h2>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {selectedIdx + 1} / {filteredSongs.length}
          </p>

          <!-- Hotkey cheatsheet -->
          <div class="mb-6 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
            <span><kbd class="kbd">1-9</kbd> escolher candidato</span>
            <span><kbd class="kbd">c</kbd>/<kbd class="kbd">p</kbd> focar cifra/partitura</span>
            <span><kbd class="kbd">↓</kbd>/<kbd class="kbd">j</kbd> próximo · <kbd class="kbd">↑</kbd>/<kbd class="kbd">k</kbd> anterior</span>
            <span><kbd class="kbd">Enter</kbd> salvar + próximo</span>
            <span><kbd class="kbd">Del</kbd> limpar campo focado</span>
            <span><kbd class="kbd">⌘S</kbd> salvar</span>
            <span><kbd class="kbd">/</kbd> buscar</span>
          </div>

          <!-- Chord -->
          <section class="mb-6 p-4 rounded-lg bg-white dark:bg-gray-900 border {focusedField === 'chord' ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-gray-200 dark:border-gray-800'}">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-800 dark:text-gray-100">
                <span class="text-blue-500">●</span> Cifra
              </h3>
              <button
                onclick={() => { focusedField = 'chord'; chordInput?.focus(); }}
                class="text-xs text-gray-400 hover:text-brand-600"
              >Focar (c)</button>
            </div>
            <input
              bind:this={chordInput}
              type="url"
              placeholder="URL da cifra escolhida"
              value={currentLink.chord || ''}
              oninput={(e) => setLink('chord', e.target.value)}
              onfocus={() => focusedField = 'chord'}
              class="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3 font-mono"
            />
            {#if candidates?.chords?.length}
              <ul class="space-y-1.5">
                {#each candidates.chords as c, i}
                  <li class="flex items-center gap-2">
                    <button
                      onclick={() => { setLink('chord', c.url); focusedField = 'chord'; }}
                      class="w-6 h-6 shrink-0 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-brand-100 dark:hover:bg-brand-900"
                      title="Escolher (tecla {i + 1})"
                    >{i + 1}</button>
                    <a href={c.url} target="_blank" rel="noreferrer" class="flex-1 text-sm text-brand-600 dark:text-brand-400 hover:underline truncate">
                      {c.source} · {c.url}
                    </a>
                    {#if currentLink.chord === c.url}
                      <span class="text-xs text-emerald-500">✓ escolhido</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </section>

          <!-- Sheet -->
          <section class="mb-6 p-4 rounded-lg bg-white dark:bg-gray-900 border {focusedField === 'sheet' ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-gray-200 dark:border-gray-800'}">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-800 dark:text-gray-100">
                <span class="text-purple-500">●</span> Partitura
              </h3>
              <button
                onclick={() => { focusedField = 'sheet'; sheetInput?.focus(); }}
                class="text-xs text-gray-400 hover:text-brand-600"
              >Focar (p)</button>
            </div>
            <input
              bind:this={sheetInput}
              type="url"
              placeholder="URL da partitura escolhida"
              value={currentLink.sheet || ''}
              oninput={(e) => setLink('sheet', e.target.value)}
              onfocus={() => focusedField = 'sheet'}
              class="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3 font-mono"
            />
            {#if candidates?.sheets?.length}
              <ul class="space-y-1.5">
                {#each candidates.sheets as c, i}
                  <li class="flex items-center gap-2">
                    <button
                      onclick={() => { setLink('sheet', c.url); focusedField = 'sheet'; }}
                      class="w-6 h-6 shrink-0 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-brand-100 dark:hover:bg-brand-900"
                      title="Escolher (tecla {i + 1})"
                    >{i + 1}</button>
                    <a href={c.url} target="_blank" rel="noreferrer" class="flex-1 text-sm text-brand-600 dark:text-brand-400 hover:underline truncate">
                      {c.source} · {c.url}
                    </a>
                    {#if currentLink.sheet === c.url}
                      <span class="text-xs text-emerald-500">✓ escolhido</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </section>

          <!-- Search helpers -->
          {#if candidates?.searches?.length}
            <section class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700">
              <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Buscas na web</h3>
              <div class="flex flex-wrap gap-2">
                {#each candidates.searches as s}
                  <a href={s.url} target="_blank" rel="noreferrer" class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:border-brand-500">
                    {s.source} ↗
                  </a>
                {/each}
              </div>
            </section>
          {/if}

          <div class="mt-6 flex justify-between">
            <button onclick={back} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-brand-500">← Anterior (k)</button>
            <button onclick={() => { save(); skip(); }} class="text-sm px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white">Salvar & Próximo (Enter)</button>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  :global(.kbd) {
    @apply inline-block px-1.5 py-0.5 text-[10px] font-mono border border-gray-300 dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-800;
  }
</style>
{/if}

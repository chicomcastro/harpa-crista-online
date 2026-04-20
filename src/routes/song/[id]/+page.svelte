<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { songs, favorites, fontSize, recentlyViewed, notes, playlists, darkMode } from '$lib/stores.js';
  import { parseVerses, shareSong, haptic } from '$lib/utils.js';
  import ImagePreviewModal from '$lib/components/ImagePreviewModal.svelte';
  import curatedLinks from '../../../../data/links.json';
  import { track } from '$lib/analytics.js';

  let shareTooltip = $state('');
  let copyTooltip = $state('');
  let audioError = $state(false);
  let audioEl;
  let activeVerse = $state(-1);
  let noteDraft = $state('');
  let showNotes = $state(false);
  let showPlaylistMenu = $state(false);
  let showMoreMenu = $state(false);
  let imageStatus = $state('');
  let revealedVerse = $state(-1);
  let previewVerse = $state(null);

  function onShared(method) {
    imageStatus = method === 'clipboard' ? 'Imagem copiada!' : method === 'download' ? 'Imagem baixada' : 'Compartilhado!';
    setTimeout(() => imageStatus = '', 2000);
  }
  let titleEl;
  let titleVisible = $state(true);

  $effect(() => {
    if (!titleEl) return;
    const headerH = (document.querySelector('header')?.offsetHeight) || 56;
    const obs = new IntersectionObserver(
      ([entry]) => { titleVisible = entry.isIntersecting; },
      { rootMargin: `-${headerH}px 0px 0px 0px` }
    );
    obs.observe(titleEl);
    return () => obs.disconnect();
  });

  // Reset audio error when song changes
  $effect(() => {
    $page.params.id;
    audioError = false;
  });

  $effect(() => {
    if (song) {
      track('song_viewed', { song_id: song.id, number: song.number, title: song.title });
      recentlyViewed.add(song.number);
      noteDraft = $notes[song.number] || '';
      showNotes = !!$notes[song.number];
      activeVerse = -1;
    }
  });

  function onAudioTimeUpdate() {
    if (!audioEl || !audioEl.duration || verses.length === 0) return;
    const ratio = audioEl.currentTime / audioEl.duration;
    const idx = Math.min(verses.length - 1, Math.floor(ratio * verses.length));
    if (idx !== activeVerse) {
      activeVerse = idx;
      const el = document.getElementById(`verse-${idx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function saveNote() {
    if (!song) return;
    notes.set(song.number, noteDraft);
    if (noteDraft.trim()) track('note_saved', { number: song.number });
  }

  async function shareVerseImage(verse) {
    if (!song) return;
    try {
      const canvas = verseToImage({
        title: song.title,
        number: song.number,
        lines: verse.lines,
        darkMode: $darkMode
      });
      const result = await shareOrDownloadCanvas(
        canvas,
        `harpa-${song.number}.png`,
        `Harpa Cristã #${song.number}`
      );
      imageStatus = result.method === 'clipboard' ? 'Imagem copiada!' : result.method === 'download' ? 'Imagem baixada' : 'Compartilhado!';
      track('verse_image_shared', { number: song.number, method: result.method });
      setTimeout(() => imageStatus = '', 2000);
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      imageStatus = 'Erro: ' + (err?.message || 'ao gerar imagem');
      setTimeout(() => imageStatus = '', 3000);
    }
  }

  function addToPlaylist(id) {
    if (!song) return;
    playlists.addSong(id, song.number);
    track('playlist_song_added', { number: song.number, from: 'song_page' });
    showPlaylistMenu = false;
  }

  function createAndAdd() {
    if (!song) return;
    const name = prompt('Nome da nova lista:');
    if (!name?.trim()) return;
    const id = playlists.create(name.trim());
    playlists.addSong(id, song.number);
    track('playlist_created', { name, from: 'song_page' });
    showPlaylistMenu = false;
  }

  const songId = $derived(parseInt($page.params.id));
  const song = $derived(songs.find(s => s.id === songId) || null);
  const songIndex = $derived(song ? songs.indexOf(song) : -1);
  const audioUrl = $derived(song ? `https://harpa.nyc3.digitaloceanspaces.com/${String(song.number).padStart(3, '0')}.mp3` : '');
  const prevSong = $derived(songIndex > 0 ? songs[songIndex - 1] : null);
  const nextSong = $derived(songIndex < songs.length - 1 ? songs[songIndex + 1] : null);
  const verses = $derived(song ? parseVerses(song.content) : []);
  const isFavorite = $derived(song ? $favorites.includes(song.number) : false);
  const externalLinks = $derived(song ? (curatedLinks[song.number] || {}) : {});

  async function handleShare() {
    if (!song) return;
    const baseUrl = window.location.origin + base;
    const ok = await shareSong(song.number, song.title, baseUrl);
    if (ok) {
      track('song_shared', { number: song.number, title: song.title });
      shareTooltip = 'Link copiado!';
      setTimeout(() => shareTooltip = '', 2000);
    }
  }

  async function handleCopy() {
    if (!song) return;
    const text = verses.map(v => v.lines.join('\n')).join('\n\n');
    const full = `${song.title} (Harpa Cristã #${song.number})\n\n${text}`;
    try {
      await navigator.clipboard.writeText(full);
      track('lyrics_copied', { number: song.number, title: song.title });
      copyTooltip = 'Copiado!';
      setTimeout(() => copyTooltip = '', 2000);
    } catch {}
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowLeft' && prevSong) {
      track('hymn_navigated', { direction: 'prev', from: song.number, to: prevSong.number, method: 'keyboard' });
      window.location.href = `${base}/song/${prevSong.id}`;
    }
    if (e.key === 'ArrowRight' && nextSong) {
      track('hymn_navigated', { direction: 'next', from: song.number, to: nextSong.number, method: 'keyboard' });
      window.location.href = `${base}/song/${nextSong.id}`;
    }
  }

  // Horizontal swipe (only when not scrolling vertically)
  let touchStartX = 0;
  let touchStartY = 0;
  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    if (dx < 0 && nextSong) {
      track('hymn_navigated', { direction: 'next', from: song.number, to: nextSong.number, method: 'swipe' });
      haptic(10);
      window.location.href = `${base}/song/${nextSong.id}`;
    } else if (dx > 0 && prevSong) {
      track('hymn_navigated', { direction: 'prev', from: song.number, to: prevSong.number, method: 'swipe' });
      haptic(10);
      window.location.href = `${base}/song/${prevSong.id}`;
    }
  }
</script>

<svelte:head>
  {#if song}
    <title>#{song.number} {song.title} — Harpa Cristã Online</title>
    <meta name="description" content={`Letra completa do hino ${song.number} "${song.title}" da Harpa Cristã. ${song.content.slice(0, 100)}…`} />
    <meta property="og:title" content="#{song.number} {song.title} — Harpa Cristã" />
    <meta property="og:description" content={song.content.slice(0, 150)} />
    <meta property="og:type" content="article" />
    {@html `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'MusicComposition',
      name: song.title,
      identifier: `Harpa Cristã #${song.number}`,
      inLanguage: 'pt-BR',
      musicCompositionForm: 'Hymn',
      lyrics: { '@type': 'CreativeWork', text: song.content }
    })}</script>`}
  {/if}
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

{#if song}
  <div ontouchstart={onTouchStart} ontouchend={onTouchEnd} role="presentation">
  <!-- Mini sticky header (iOS-style) -->
  <div
    class="fixed left-0 right-0 top-14 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-transform duration-200 will-change-transform {titleVisible ? '-translate-y-full pointer-events-none' : 'translate-y-0'}"
    aria-hidden={titleVisible}
  >
    <div class="container mx-auto px-4 max-w-2xl h-12 flex items-center gap-3">
      <button
        onclick={() => { if (history.length > 1) history.back(); else window.location.href = `${base}/`; }}
        class="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 shrink-0"
        aria-label="Voltar"
      >
        <span class="mi">arrow_back</span>
      </button>
      <div class="flex-1 min-w-0 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
        #{song.number} {song.title}
      </div>
    </div>
  </div>

  <div class="container mx-auto px-4 py-3 max-w-2xl">
    <!-- Top bar -->
    <div class="flex items-center justify-between mb-3">
      <button
        onclick={() => {
          if (history.length > 1) history.back();
          else window.location.href = `${base}/`;
        }}
        class="btn-icon text-gray-500 dark:text-gray-400"
        aria-label="Voltar para lista"
      >
        <span class="mi">arrow_back</span>
      </button>
      <div class="flex items-center gap-1">
        <!-- Font size controls -->
        <button onclick={() => { fontSize.decrease(); track('font_size_changed', { action: 'decrease', size: $fontSize }); }} class="btn-icon" aria-label="Diminuir fonte">
          <span class="mi mi-sm">remove</span>
        </button>
        <button onclick={() => { fontSize.reset(); track('font_size_changed', { action: 'reset', size: $fontSize }); }} class="btn-icon text-xs font-mono text-gray-400 dark:text-gray-500 w-8 text-center" aria-label="Resetar fonte">
          {$fontSize}
        </button>
        <button onclick={() => { fontSize.increase(); track('font_size_changed', { action: 'increase', size: $fontSize }); }} class="btn-icon" aria-label="Aumentar fonte">
          <span class="mi mi-sm">add</span>
        </button>

        <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>

        <!-- Favorite -->
        <button
          onclick={() => { favorites.toggle(song.number); haptic(!isFavorite ? 15 : 8); track('favorite_toggled', { number: song.number, favorited: !isFavorite }); }}
          class="btn-icon {isFavorite ? 'text-red-500' : ''}"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <span class="mi mi-sm {isFavorite ? 'mi-filled' : ''}">favorite</span>
        </button>

        <!-- Copy -->
        <div class="relative hidden sm:block">
          <button onclick={handleCopy} class="btn-icon" aria-label="Copiar letra">
            <span class="mi mi-sm">content_copy</span>
          </button>
          {#if copyTooltip}
            <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded">
              {copyTooltip}
            </span>
          {/if}
        </div>

        <!-- Playlist -->
        <div class="relative hidden sm:block">
          <button onclick={() => showPlaylistMenu = !showPlaylistMenu} class="btn-icon" aria-label="Adicionar à lista">
            <span class="mi mi-sm">playlist_add</span>
          </button>
          {#if showPlaylistMenu}
            <div class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1">
              <div class="px-3 py-1 text-xs text-gray-400 uppercase tracking-wider">Adicionar a</div>
              {#each $playlists as pl (pl.id)}
                <button
                  onclick={() => addToPlaylist(pl.id)}
                  disabled={pl.numbers.includes(song.number)}
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span class="truncate">{pl.name}</span>
                  {#if pl.numbers.includes(song.number)}<span class="text-xs text-gray-400">✓</span>{/if}
                </button>
              {/each}
              <button
                onclick={createAndAdd}
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 text-brand-600 dark:text-brand-400"
              >+ Nova lista</button>
            </div>
          {/if}
        </div>

        <!-- Apresentação (desktop) -->
        <a
          href="{base}/song/{song.id}/present"
          onclick={() => track('presentation_opened_nav', { number: song.number })}
          class="btn-icon hidden sm:inline-flex"
          aria-label="Modo apresentação"
        >
          <span class="mi mi-sm">present_to_all</span>
        </a>

        <!-- Share -->
        <div class="relative">
          <button onclick={handleShare} class="btn-icon" aria-label="Compartilhar hino">
            <span class="mi mi-sm">share</span>
          </button>
          {#if shareTooltip}
            <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded">
              {shareTooltip}
            </span>
          {/if}
        </div>

        <!-- More menu (mobile only) -->
        <div class="relative sm:hidden">
          <button onclick={() => showMoreMenu = !showMoreMenu} class="btn-icon" aria-label="Mais opções">
            <span class="mi mi-sm">more_vert</span>
          </button>
          {#if showMoreMenu}
            <div class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1">
              <button onclick={() => { showMoreMenu = false; handleCopy(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                Copiar letra
              </button>
              <a
                href="{base}/song/{song.id}/present"
                onclick={() => track('presentation_opened_nav', { number: song.number })}
                class="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Modo apresentação
              </a>
              <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>
              <div class="px-3 py-1 text-xs text-gray-400 uppercase tracking-wider">Adicionar à lista</div>
              {#each $playlists as pl (pl.id)}
                <button
                  onclick={() => { addToPlaylist(pl.id); showMoreMenu = false; }}
                  disabled={pl.numbers.includes(song.number)}
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-between"
                >
                  <span class="truncate">{pl.name}</span>
                  {#if pl.numbers.includes(song.number)}<span class="text-xs text-gray-400">✓</span>{/if}
                </button>
              {/each}
              <button
                onclick={() => { createAndAdd(); showMoreMenu = false; }}
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-600 dark:text-brand-400"
              >+ Nova lista</button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Song header -->
    <div class="mb-4" bind:this={titleEl}>
      <div class="flex items-center gap-2">
        <span class="shrink-0 w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-base font-bold">
          {song.number}
        </span>
        <h1 class="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{song.title}</h1>
      </div>
    </div>

    <!-- External curated links -->
    {#if externalLinks.chord || externalLinks.sheet}
      <div class="flex flex-wrap gap-2 mb-4">
        {#if externalLinks.chord}
          <a
            href={externalLinks.chord}
            target="_blank"
            rel="noreferrer"
            onclick={() => track('external_chord_opened', { number: song.number })}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 dark:bg-gray-900 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-gray-800"
          >
            <span class="mi mi-sm">music_note</span> Ver cifra ↗
          </a>
        {/if}
        {#if externalLinks.sheet}
          <a
            href={externalLinks.sheet}
            target="_blank"
            rel="noreferrer"
            onclick={() => track('external_sheet_opened', { number: song.number })}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-gray-900 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-gray-800"
          >
            <span class="mi mi-sm">library_music</span> Ver partitura ↗
          </a>
        {/if}
      </div>
    {/if}

    <!-- Audio player -->
    {#if !audioError}
      <div class="mb-4">
        <audio
          bind:this={audioEl}
          src={audioUrl}
          controls
          preload="none"
          onplay={() => track('audio_played', { number: song.number, title: song.title })}
          onerror={() => { audioError = true; track('audio_errored', { number: song.number }); }}
          ontimeupdate={onAudioTimeUpdate}
          class="w-full h-10 rounded-lg [&::-webkit-media-controls-panel]:bg-gray-100 dark:[&::-webkit-media-controls-panel]:bg-gray-800"
        >
          <track kind="captions" />
        </audio>
      </div>
    {/if}

    <!-- Verses -->
    <div class="song-content font-serif" style="font-size: {$fontSize}px; line-height: 1.7;">
      {#each verses as verse, i}
        <div
          id="verse-{i}"
          role="button"
          tabindex="0"
          onclick={() => revealedVerse = revealedVerse === i ? -1 : i}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealedVerse = revealedVerse === i ? -1 : i; } }}
          class="group relative mb-6 transition-colors rounded-md px-2 -mx-2 cursor-pointer {activeVerse === i ? 'bg-brand-50/60 dark:bg-brand-950/40' : ''} {verse.isChorus ? 'pl-6 border-l-2 border-brand-300 dark:border-brand-700 italic text-gray-600 dark:text-gray-400' : ''}"
        >
          {#each verse.lines as line}
            <p class="mb-0.5">{line}</p>
          {/each}
          <button
            onclick={(e) => { e.stopPropagation(); previewVerse = verse; revealedVerse = -1; }}
            class="absolute top-1 right-1 w-8 h-8 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity {revealedVerse === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}"
            aria-label="Compartilhar este verso como imagem"
          >
            <span class="mi mi-sm">share</span>
          </button>
        </div>
      {/each}
    </div>

    <!-- Notes -->
    <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      {#if !showNotes && !noteDraft}
        <button onclick={() => showNotes = true} class="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
          + Adicionar nota pessoal
        </button>
      {:else}
        <label class="block text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2">
          Nota pessoal
        </label>
        <textarea
          bind:value={noteDraft}
          onblur={saveNote}
          placeholder="Reflexões, referências bíblicas, lembranças…"
          rows="3"
          class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        ></textarea>
        <p class="text-xs text-gray-400 mt-1">Salva automaticamente no seu navegador.</p>
      {/if}
    </div>

    <!-- Navigation -->
    <nav class="flex items-center justify-between mt-12 pt-6 border-t border-gray-200 dark:border-gray-800" aria-label="Navegação entre hinos">
      {#if prevSong}
        <a
          href="{base}/song/{prevSong.id}"
          onclick={() => track('hymn_navigated', { direction: 'prev', from: song.number, to: prevSong.number, method: 'button' })}
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
        >
          <span class="mi mi-sm group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
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
          onclick={() => track('hymn_navigated', { direction: 'next', from: song.number, to: nextSong.number, method: 'button' })}
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group text-right"
        >
          <div>
            <div class="text-xs text-gray-400 dark:text-gray-500">Próximo</div>
            <div class="font-medium">#{nextSong.number} {nextSong.title}</div>
          </div>
          <span class="mi mi-sm group-hover:translate-x-0.5 transition-transform">chevron_right</span>
        </a>
      {/if}
    </nav>

    <!-- Keyboard hint -->
    <p class="text-center text-xs text-gray-300 dark:text-gray-700 mt-4 hidden sm:block">
      Use as setas <kbd class="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 font-mono">&larr;</kbd>
      <kbd class="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 font-mono">&rarr;</kbd> para navegar
    </p>
  </div>
  </div>

  {#if imageStatus}
    <div class="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 z-50 px-4 py-2 rounded-lg bg-gray-900/95 dark:bg-gray-100 text-white dark:text-gray-900 text-sm shadow-lg backdrop-blur">
      {imageStatus}
    </div>
  {/if}

  <ImagePreviewModal
    open={!!previewVerse}
    title={song.title}
    number={song.number}
    lines={previewVerse?.lines || []}
    filename={`harpa-${song.number}.png`}
    shareTitle={`Harpa Cristã #${song.number}`}
    eventName="verse_image_shared"
    onClose={() => previewVerse = null}
    {onShared}
  />
{:else}
  <div class="container mx-auto px-4 py-16 text-center">
    <p class="text-xl text-gray-500 dark:text-gray-400">Hino não encontrado</p>
    <a href="{base}/" class="mt-4 inline-block text-brand-600 dark:text-brand-400 hover:underline">Voltar para a lista</a>
  </div>
{/if}

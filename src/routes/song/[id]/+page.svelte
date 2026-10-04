<script>
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import { songs, favorites, fontSize, recentlyViewed, notes, playlists, darkMode } from '$lib/stores.js';
  import { parseVerses, shareSong, haptic, caixaNormal, passoRolagem } from '$lib/utils.js';
  import ImagePreviewModal from '$lib/components/ImagePreviewModal.svelte';
  import curatedLinks from '../../../../data/links.json';
  import partituras from '../../../../data/partituras.json';
  import Partituras from '$lib/components/Partituras.svelte';
  import { track } from '$lib/analytics.js';
  import { tick } from 'svelte';

  let shareTooltip = $state('');
  let copyTooltip = $state('');
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

  $effect(() => {
    if (song) {
      track('song_viewed', { song_id: song.id, number: song.number, title: song.title });
      recentlyViewed.add(song.number);
      aba = 'letra';
      scrollLetra = 0;
      pararRolagem();
      mostrarRolagem = false;
      showSheet = false;   // troca de hino fecha na hora, sem animar
      folhaAberta = false;
      arrasto = 0;
      noteDraft = $notes[song.number] || '';
      showNotes = !!$notes[song.number];
    }
  });

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
  const prevSong = $derived(songIndex > 0 ? songs[songIndex - 1] : null);
  const nextSong = $derived(songIndex < songs.length - 1 ? songs[songIndex + 1] : null);
  const verses = $derived(song ? parseVerses(song.content) : []);
  const isFavorite = $derived(song ? $favorites.includes(song.number) : false);
  const externalLinks = $derived(song ? (curatedLinks[song.number] || {}) : {});
  // Partituras do canal Harpa Cristã Partituras: no desktop ficam na coluna da direita; no celular, as
  // miniaturas ao lado do título abrem o painel embaixo dele.
  const temPartituraPropria = $derived(song ? !!partituras.hinos[String(song.number)]?.versoes?.length : false);
  const hoje = new Date().toLocaleDateString('sv-SE');
  const videos = $derived(song ? (partituras.hinos[String(song.number)]?.versoes || [])
    .filter(v => v.youtube_id && (!v.publicado_em || v.publicado_em <= hoje)) : []);
  // Partitura em site externo convive com a do canal: são acervos diferentes, e às vezes a de fora
  // tem o arranjo que a nossa não tem. Antes ela sumia quando o hino tinha partitura própria.
  const temRefrao = $derived(verses.some(v => v.isChorus));
  const qtdVersoes = $derived(partituras.hinos[String(song?.number)]?.versoes?.length || 0);
  const temExternos = $derived(!!externalLinks.chord || !!externalLinks.sheet);
  let showSheet = $state(false);

  /*
   * Folha de opções: sobe de baixo e fecha arrastando o agarrador.
   *
   * A animação é feita na mão, não com transition: do Svelte, porque as duas coisas disputam o
   * mesmo `transform`: o outro do fly começaria de translateY(0) e daria um salto quando a folha
   * já estivesse arrastada para baixo.
   *
   * Enquanto o dedo está na tela a transição é desligada (senão cada frame do arrasto seria
   * animado e a folha ficaria "molenga"); ao soltar, ela volta e leva a folha até o destino.
   *
   * Fecha por distância OU por velocidade: um puxão curto e rápido também deve fechar, que é o
   * gesto que a pessoa faz sem pensar.
   */
  const DURACAO_FOLHA = 260;
  const FECHA_DISTANCIA = 90;   // px
  const FECHA_VELOCIDADE = 0.5; // px/ms

  let folhaAberta = $state(false);
  let arrasto = $state(0);
  let arrastando = $state(false);
  let arrastoY0 = 0;
  let arrastoT0 = 0;

  $effect(() => {
    if (!showSheet) return;
    arrasto = 0;
    const id = requestAnimationFrame(() => folhaAberta = true);
    return () => cancelAnimationFrame(id);
  });

  function fecharFolha() {
    arrastando = false;
    arrasto = 0;
    folhaAberta = false;
    setTimeout(() => { if (!folhaAberta) showSheet = false; }, DURACAO_FOLHA);
  }

  function arrastoInicio(e) {
    arrastando = true;
    arrastoY0 = e.clientY;
    arrastoT0 = performance.now();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function arrastoMove(e) {
    if (!arrastando) return;
    arrasto = Math.max(0, e.clientY - arrastoY0); // só para baixo
  }

  function arrastoFim(e) {
    if (!arrastando) return;
    arrastando = false;
    const velocidade = arrasto / Math.max(performance.now() - arrastoT0, 1);
    if (arrasto > FECHA_DISTANCIA || velocidade > FECHA_VELOCIDADE) {
      track('sheet_dismissed', { number: song.number, gesture: 'drag' });
      fecharFolha();
    } else {
      arrasto = 0; // volta para o lugar
    }
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  /*
   * Abas Letra | Partitura (#4). 96% dos hinos são só letra, então a aba de partitura só existe
   * quando há versão — nada de aba vazia. A cifra não é aba: é link para site externo, e misturar
   * "conteúdo daqui" com "sai do app" na mesma fileira engana.
   *
   * As duas abas ficam montadas e alternam com `hidden`, para não refazer a letra inteira a cada
   * troca; o scroll da letra é guardado na mão porque esconder o bloco encolhe a página.
   */
  /*
   * "Pedir este hino" (#10). 612 dos 640 hinos não têm partitura, e até agora quem caía num deles
   * via só a letra: o app não oferecia caminho nem aprendia com a visita.
   *
   * O pedido vai por dois canais de propósito. O evento do Amplitude é o que o youtube-manager
   * consegue ler para priorizar a fila de arranjos (não depende de ninguém catar comentário na
   * mão). A aba de comunidade do canal é onde o pedido fica público, que é o que faz outra pessoa
   * pedir o mesmo hino. Ver chicomcastro/youtube-manager#10.
   *
   * O "já pedi" fica no localStorage só para a pessoa não ficar sem resposta ao tocar — não é
   * contagem de verdade, que vive no Amplitude.
   */
  const POST_PEDIDOS = 'https://www.youtube.com/post/UgkxAyn7YBAeKjSESTKluAlNy_4U40H9TX_A';
  const CHAVE_PEDIDOS = 'hc_pedidos';
  let pedido = $state(false);

  $effect(() => {
    if (!song) return;
    try { pedido = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) || '[]').includes(song.number); }
    catch { pedido = false; }
  });

  function pedirHino() {
    track('hymn_requested', { number: song.number, title: song.title });
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) || '[]');
      if (!lista.includes(song.number)) localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([...lista, song.number]));
    } catch {}
    pedido = true;
    window.open(POST_PEDIDOS, '_blank', 'noreferrer');
  }

  let aba = $state('letra');
  let scrollLetra = 0;

  /*
   * Rolagem automática e tela acesa (#12).
   *
   * Tocando num culto as duas mãos estão no instrumento: não dá para rolar a letra, e o celular
   * apaga sozinho no meio do hino.
   *
   * A velocidade é px por SEGUNDO, calculada pelo timestamp do rAF — não por frame. Por frame, o
   * mesmo nível rolaria o dobro num celular de 120Hz e pararia numa aba em segundo plano, onde o
   * navegador derruba o rAF para ~1fps. O resto fracionário é acumulado entre frames, porque
   * scrollBy(0, 0.4) não anda.
   *
   * Decisão: o diagnóstico pedia "pausa ao tocar na tela", mas a área da letra já usa o toque para
   * revelar o botão de compartilhar verso. Um toque que faz as duas coisas é ambíguo, então a pausa
   * ficou num controle explícito, junto da velocidade.
   *
   * O Wake Lock precisa ser pedido dentro do gesto do usuário (não dá para pedir num $effect), e o
   * navegador o solta sozinho quando a aba perde o foco — por isso o reativamos no visibilitychange.
   */
  let rolando = $state(false);
  let velocidade = $state(2);
  let mostrarRolagem = $state(false);
  let wakeLock = null;
  let rafId = 0;
  let sobra = 0;
  let ultimoT = 0;


  async function segurarTela() {
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }

  function soltarTela() {
    try { wakeLock?.release(); } catch {}
    wakeLock = null;
  }

  function frame(t) {
    if (!rolando) return;
    const dt = ultimoT ? (t - ultimoT) / 1000 : 0;
    ultimoT = t;
    const passo = passoRolagem(velocidade, dt, sobra);
    sobra = passo.sobra;
    if (passo.px >= 1) {
      window.scrollBy(0, passo.px);
      const fim = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= fim - 1) { pararRolagem(); return; }
    }
    rafId = requestAnimationFrame(frame);
  }

  function alternarRolagem() {
    if (rolando) { pararRolagem(); return; }
    rolando = true;
    mostrarRolagem = true;
    sobra = 0;
    ultimoT = 0;
    segurarTela();
    rafId = requestAnimationFrame(frame);
    track('autoscroll_started', { number: song.number, speed: velocidade });
  }

  function pararRolagem() {
    rolando = false;
    cancelAnimationFrame(rafId);
    soltarTela();
  }

  $effect(() => {
    if (!browser) return;
    const onVis = () => { if (document.visibilityState === 'visible' && rolando) segurarTela(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); pararRolagem(); };
  });

  function trocarAba(nova) {
    if (nova === aba) return;
    if (aba === 'letra') scrollLetra = window.scrollY;
    aba = nova;
    track('song_tab_changed', { number: song.number, tab: nova });
    tick().then(() => window.scrollTo({ top: nova === 'letra' ? scrollLetra : 0 }));
  }
  let showFonte = $state(false);
  function abrirPartituraBarra() {
    fecharFolha();
    trocarAba('partitura');
  }

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
    if (e.key === 'Escape' && showSheet) { fecharFolha(); return; }
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

  <div class="container mx-auto px-4 pt-3 pb-24 sm:pb-3 max-w-2xl lg:max-w-5xl">
    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
    <div class="min-w-0">
    <div class="mb-3">
      <button
        onclick={() => {
          if (history.length > 1) history.back();
          else window.location.href = `${base}/`;
        }}
        class="btn-icon text-gray-500 dark:text-gray-400 -ml-2"
        aria-label="Voltar para lista"
      >
        <span class="mi">arrow_back</span>
      </button>
    </div>

    <!--
      Topo do hino como no mockup (docs/ux/telas-propostas.pdf, p.12): título com uma linha de
      metadados embaixo e, à direita, três ações com peso visual — favoritar, compartilhar e Palco,
      esta com rótulo. Antes eram seis ícones sem rótulo soltos numa barra acima do título, sem
      relação visível com ele; copiar, lista e links externos desceram para o ⋮, onde o uso é raro.
    -->
    <div class="flex items-start justify-between gap-4 mb-5" bind:this={titleEl}>
      <div class="flex items-start gap-3 min-w-0">
        <span class="shrink-0 w-10 h-10 mt-0.5 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center text-base font-bold">
          {song.number}
        </span>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{song.title}</h1>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {verses.length} {verses.length === 1 ? 'estrofe' : 'estrofes'}{temRefrao ? ' · refrão' : ''}{temPartituraPropria ? ` · ${qtdVersoes} ${qtdVersoes === 1 ? 'partitura' : 'partituras'}` : ''}{externalLinks.chord ? ' · cifra' : ''}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onclick={() => { favorites.toggle(song.number); haptic(!isFavorite ? 15 : 8); track('favorite_toggled', { number: song.number, favorited: !isFavorite }); }}
          class="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 {isFavorite ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <span class="mi mi-sm {isFavorite ? 'mi-filled' : ''}">favorite</span>
        </button>

        <div class="relative hidden sm:block">
          <button onclick={handleShare} class="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400" aria-label="Compartilhar hino">
            <span class="mi mi-sm">share</span>
          </button>
          {#if shareTooltip}
            <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded">{shareTooltip}</span>
          {/if}
        </div>

        <a
          href="{base}/song/{song.id}/present"
          onclick={() => track('presentation_opened_nav', { number: song.number })}
          class="hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span class="mi mi-sm">present_to_all</span> Palco
        </a>

        <div class="relative hidden sm:block">
          <button onclick={() => showMoreMenu = !showMoreMenu} class="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Mais opções">
            <span class="mi mi-sm">more_vert</span>
          </button>
          {#if showMoreMenu}
            <div class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1">
              <button onclick={() => { showMoreMenu = false; handleCopy(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                <span class="mi mi-sm text-gray-500">content_copy</span> Copiar letra
              </button>
              <div class="px-3 pt-2 pb-1 text-xs text-gray-400 uppercase tracking-wider">Adicionar à lista</div>
              {#each $playlists as pl (pl.id)}
                <button
                  onclick={() => { addToPlaylist(pl.id); showMoreMenu = false; }}
                  disabled={pl.numbers.includes(song.number)}
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-between gap-2"
                >
                  <span class="truncate">{pl.name}</span>
                  {#if pl.numbers.includes(song.number)}<span class="text-xs text-gray-400">✓</span>{/if}
                </button>
              {/each}
              <button onclick={() => { showMoreMenu = false; createAndAdd(); }} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-600 dark:text-brand-400 flex items-center gap-2">
                <span class="mi mi-sm">playlist_add</span> Nova lista
              </button>
              {#if temExternos}
                <div class="px-3 pt-2 pb-1 text-xs text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800 mt-1">Em outros sites</div>
                {#if externalLinks.chord}
                  <a href={externalLinks.chord} target="_blank" rel="noreferrer"
                    onclick={() => { showMoreMenu = false; track('external_chord_opened', { number: song.number }); }}
                    class="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Cifra ↗</a>
                {/if}
                {#if externalLinks.sheet}
                  <a href={externalLinks.sheet} target="_blank" rel="noreferrer"
                    onclick={() => { showMoreMenu = false; track('external_sheet_opened', { number: song.number }); }}
                    class="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Partitura ↗</a>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!--
      Abas numa linha só, mesma altura (#4 + feedback). A Cifra continua sendo link externo, mas
      quebrar linha fazia ela parecer de outra família; agora fica ao lado, com a mesma caixa e o ↗
      dizendo que sai do app. "site externo" some no celular, onde o espaço não dá.

      Vídeo é aba: estava empilhado embaixo da partitura, e são duas formas de consumir a mesma
      coisa — ou se lê a pauta, ou se assiste. Um Partituras só serve as duas, senão cada aba teria
      a sua escolha de instrumento.
    -->
    <div class="flex items-center gap-2 mb-5 flex-nowrap overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div class="inline-flex shrink-0 p-1 rounded-xl bg-gray-100 dark:bg-gray-900" role="tablist" aria-label="Conteúdo do hino">
        <button
          role="tab"
          aria-selected={aba === 'letra'}
          onclick={() => trocarAba('letra')}
          class="h-10 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors {aba === 'letra' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}"
        >Letra</button>
        {#if temPartituraPropria}
          <button
            role="tab"
            aria-selected={aba === 'partitura'}
            onclick={() => trocarAba('partitura')}
            class="h-10 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors {aba === 'partitura' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}"
          >Partitura</button>
        {/if}
        {#if videos.length}
          <button
            role="tab"
            aria-selected={aba === 'video'}
            onclick={() => trocarAba('video')}
            class="h-10 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors {aba === 'video' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}"
          >Vídeo</button>
        {/if}
      </div>
      {#if externalLinks.chord}
        <a
          href={externalLinks.chord}
          target="_blank"
          rel="noreferrer"
          onclick={() => track('external_chord_opened', { number: song.number, from: 'chip' })}
          class="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 sm:px-4 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >Cifra <span class="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">site externo</span> <span class="text-gray-400">↗</span></a>
      {/if}
    </div>

    {#if temPartituraPropria}
      <div class={aba === 'partitura' || aba === 'video' ? '' : 'hidden'}>
        <Partituras number={song.number} mostrar={aba === 'video' ? 'video' : 'partitura'} class="mb-6" />
      </div>
    {/if}

    <div class={aba === 'letra' ? '' : 'hidden'}>
    <!-- Verses -->
    <!-- max-w-2xl na própria letra: a coluna cresce até 5xl no desktop, e o botão de compartilhar,
         ancorado na direita do verso, ficava solto a meia tela do texto. -->
    <div class="song-content font-serif max-w-2xl" style="font-size: {$fontSize}px; line-height: 1.7;">
      {#each verses as verse, i}
        <div
          id="verse-{i}"
          role="button"
          tabindex="0"
          onclick={() => revealedVerse = revealedVerse === i ? -1 : i}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealedVerse = revealedVerse === i ? -1 : i; } }}
          class="group relative mb-6 transition-colors rounded-md px-2 -mx-2 cursor-pointer {verse.isChorus ? 'pl-6 border-l-2 border-brand-300 dark:border-brand-700' : ''}"
        >
          {#if verse.isChorus}
            <div class="text-[11px] uppercase tracking-widest text-brand-600 dark:text-brand-400 font-semibold font-sans mb-1">Refrão</div>
          {/if}
          {#each verse.lines as line}
            <p class="mb-0.5">{verse.isChorus ? caixaNormal(line) : line}</p>
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

      {#if !temPartituraPropria}
        <div class="mt-8 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h2 class="font-semibold text-gray-800 dark:text-gray-100">Ainda não tem partitura deste hino</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Os mais pedidos entram na fila do canal Harpa Cristã Partituras.
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <button
              onclick={pedirHino}
              class="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
            >
              <span class="mi mi-sm">{pedido ? 'check' : 'campaign'}</span>{pedido ? 'Pedido registrado' : 'Pedir este hino'}
            </button>
            <a
              href="{base}/?part=1"
              onclick={() => track('filter_opened_from_request', { number: song.number })}
              class="inline-flex items-center min-h-[44px] px-4 text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >Ver os {Object.keys(partituras.hinos).length} que já têm</a>
          </div>
        </div>
      {/if}
    </div><!-- /aba letra -->

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

    <!--
      Painel de ferramentas do desktop (#6). Só na aba Letra: rolagem automática e tamanho de texto
      não fazem nada numa pauta nem num vídeo, e um painel que não responde é pior que painel nenhum.
    -->
    <aside class="hidden {aba === 'letra' ? 'lg:block' : ''}">
      <div class="sticky top-20 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 class="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-3">Ferramentas</h2>

        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-sm text-gray-700 dark:text-gray-300">Rolagem</span>
          <div class="flex items-center gap-1">
            <button onclick={() => velocidade = Math.max(1, velocidade - 1)} disabled={velocidade <= 1} class="btn-icon disabled:opacity-30" aria-label="Rolar mais devagar"><span class="mi mi-sm">remove</span></button>
            <button onclick={alternarRolagem} class="w-11 h-9 flex items-center justify-center rounded-lg {rolando ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}" aria-label={rolando ? 'Pausar rolagem' : 'Iniciar rolagem automática'}>
              <span class="mi mi-sm">{rolando ? 'pause' : 'play_arrow'}</span>
            </button>
            <button onclick={() => velocidade = Math.min(5, velocidade + 1)} disabled={velocidade >= 5} class="btn-icon disabled:opacity-30" aria-label="Rolar mais rápido"><span class="mi mi-sm">add</span></button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-sm text-gray-700 dark:text-gray-300">Texto</span>
          <div class="flex items-center gap-1">
            <button onclick={() => { fontSize.decrease(); track('font_size_changed', { action: 'decrease', size: $fontSize, from: 'panel' }); }} class="btn-icon" aria-label="Diminuir texto"><span class="mi mi-sm">remove</span></button>
            <button onclick={() => fontSize.reset()} class="w-8 text-xs font-mono text-gray-400" aria-label="Tamanho padrão">{$fontSize}</button>
            <button onclick={() => { fontSize.increase(); track('font_size_changed', { action: 'increase', size: $fontSize, from: 'panel' }); }} class="btn-icon" aria-label="Aumentar texto"><span class="mi mi-sm">add</span></button>
          </div>
        </div>

      </div>
    </aside>
    </div>
  </div>
  </div>


  <!-- Barra do músico (#6): o que se usa tocando, não o que se usa uma vez. -->
  <div class="sm:hidden fixed inset-x-0 bottom-20 z-40 flex justify-center pointer-events-none">
    {#if showFonte}
      <div class="pointer-events-auto absolute bottom-full mb-2 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-gray-900/95 text-white shadow-xl">
        <button onclick={() => { fontSize.decrease(); track('font_size_changed', { action: 'decrease', size: $fontSize, from: 'bar' }); }} class="w-11 h-11 flex items-center justify-center" aria-label="Diminuir texto"><span class="mi">remove</span></button>
        <button onclick={() => fontSize.reset()} class="w-11 text-sm font-mono text-gray-300" aria-label="Tamanho padrão">{$fontSize}</button>
        <button onclick={() => { fontSize.increase(); track('font_size_changed', { action: 'increase', size: $fontSize, from: 'bar' }); }} class="w-11 h-11 flex items-center justify-center" aria-label="Aumentar texto"><span class="mi">add</span></button>
      </div>
    {/if}
    {#if mostrarRolagem}
      <div class="pointer-events-auto absolute bottom-full mb-2 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-gray-900/95 text-white shadow-xl">
        <button onclick={() => velocidade = Math.max(1, velocidade - 1)} disabled={velocidade <= 1} class="w-11 h-11 flex items-center justify-center disabled:opacity-30" aria-label="Rolar mais devagar"><span class="mi">remove</span></button>
        <button onclick={alternarRolagem} class="w-11 h-11 flex items-center justify-center" aria-label={rolando ? 'Pausar rolagem' : 'Retomar rolagem'}><span class="mi">{rolando ? 'pause' : 'play_arrow'}</span></button>
        <span class="w-8 text-center text-sm font-mono text-gray-300" aria-hidden="true">{velocidade}</span>
        <button onclick={() => velocidade = Math.min(5, velocidade + 1)} disabled={velocidade >= 5} class="w-11 h-11 flex items-center justify-center disabled:opacity-30" aria-label="Rolar mais rápido"><span class="mi">add</span></button>
        <button onclick={() => { pararRolagem(); mostrarRolagem = false; }} class="w-11 h-11 flex items-center justify-center text-gray-400" aria-label="Fechar rolagem"><span class="mi">close</span></button>
      </div>
    {/if}
    <div class="pointer-events-auto relative flex items-stretch px-1.5 py-1 rounded-2xl bg-gray-900/95 text-white shadow-xl ring-1 ring-white/15 backdrop-blur overflow-hidden">
      <button onclick={() => { showFonte = false; if (rolando) pararRolagem(); else alternarRolagem(); }} class="flex flex-col items-center justify-center w-16 py-1 text-[11px] gap-0.5 {rolando ? 'text-brand-300' : ''}">
        <span class="mi">{rolando ? 'pause' : 'arrow_downward'}</span>Rolar
      </button>
      <button onclick={() => { showFonte = !showFonte; mostrarRolagem = false; }} class="flex flex-col items-center justify-center w-16 py-1 text-[11px] gap-0.5 {showFonte ? 'text-brand-300' : ''}">
        <span class="mi">format_size</span>Aa
      </button>
      <a href="{base}/song/{song.id}/present" onclick={() => track('presentation_opened_nav', { number: song.number, from: 'bar' })} class="flex flex-col items-center justify-center w-16 py-1 text-[11px] gap-0.5">
        <span class="mi">present_to_all</span>Palco
      </a>
      <button onclick={() => { showSheet = true; showFonte = false; }} class="flex flex-col items-center justify-center w-16 py-1 text-[11px] gap-0.5">
        <span class="mi">more_horiz</span>Opções
      </button>
    </div>
  </div>

  {#if showSheet}
    <div class="sm:hidden fixed inset-0 z-[60]" role="presentation">
      <button
        class="absolute inset-0 bg-black/50 transition-opacity duration-[260ms] motion-reduce:transition-none {folhaAberta && !arrasto ? 'opacity-100' : folhaAberta ? 'opacity-70' : 'opacity-0'}"
        onclick={fecharFolha}
        aria-label="Fechar opções"
      ></button>
      <div
        class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-gray-900 pb-6 safe-bottom shadow-2xl max-h-[80vh] overflow-y-auto will-change-transform
          {arrastando ? '' : 'transition-transform duration-[260ms] ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none'}
          {folhaAberta ? '' : 'translate-y-full'}"
        style={arrasto ? `transform: translateY(${arrasto}px)` : ''}
      >
        <!--
          Agarrador: a área de toque tem 32px de altura, não a espessura da linha. touch-none impede
          o navegador de interpretar o gesto como rolagem da folha antes do pointermove chegar.
        -->
        <div
          class="sticky top-0 z-10 flex items-center justify-center h-8 cursor-grab active:cursor-grabbing touch-none bg-white dark:bg-gray-900 rounded-t-2xl"
          onpointerdown={arrastoInicio}
          onpointermove={arrastoMove}
          onpointerup={arrastoFim}
          onpointercancel={arrastoFim}
          role="button"
          tabindex="0"
          aria-label="Arraste para baixo para fechar"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fecharFolha(); } }}
        >
          <span class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700"></span>
        </div>
        <div class="px-4 pb-2 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">#{song.number} {song.title}</div>
        <button onclick={() => { favorites.toggle(song.number); haptic(15); track('favorite_toggled', { number: song.number, favorited: !isFavorite, from: 'sheet' }); }} class="sheet-item">
          <span class="mi {isFavorite ? 'mi-filled text-red-500' : ''}">favorite</span>{isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
        </button>
        <button onclick={() => { fecharFolha(); handleShare(); }} class="sheet-item"><span class="mi">share</span>Compartilhar</button>
        <button onclick={() => { fecharFolha(); handleCopy(); }} class="sheet-item"><span class="mi">content_copy</span>Copiar letra</button>
        <a href="{base}/song/{song.id}/present" onclick={() => track('presentation_opened_nav', { number: song.number, from: 'sheet' })} class="sheet-item"><span class="mi">present_to_all</span>Modo apresentação</a>
        <div class="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider">Adicionar à lista</div>
        {#each $playlists as pl (pl.id)}
          <button onclick={() => { addToPlaylist(pl.id); fecharFolha(); }} disabled={pl.numbers.includes(song.number)} class="sheet-item disabled:opacity-40">
            <span class="mi">queue_music</span><span class="flex-1 truncate text-left">{pl.name}</span>{#if pl.numbers.includes(song.number)}<span class="text-xs text-gray-400">✓</span>{/if}
          </button>
        {/each}
        <button onclick={() => { fecharFolha(); createAndAdd(); }} class="sheet-item text-brand-600 dark:text-brand-400"><span class="mi">playlist_add</span>Nova lista</button>
        {#if temExternos}
          <div class="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider">Em outros sites</div>
          {#if externalLinks.chord}
            <a href={externalLinks.chord} target="_blank" rel="noreferrer" onclick={() => track('external_chord_opened', { number: song.number, from: 'sheet' })} class="sheet-item"><span class="mi">music_note</span>Cifra ↗</a>
          {/if}
          {#if externalLinks.sheet}
            <a href={externalLinks.sheet} target="_blank" rel="noreferrer" onclick={() => track('external_sheet_opened', { number: song.number, from: 'sheet' })} class="sheet-item"><span class="mi">library_music</span>Partitura ↗</a>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

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
    shareCaption={`🎵 Harpa Cristã #${song.number} — ${song.title}\n\nAbra o hino: ${typeof window !== 'undefined' ? window.location.origin : 'https://chicomcastro.github.io'}${base}/song/${song.id}`}
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

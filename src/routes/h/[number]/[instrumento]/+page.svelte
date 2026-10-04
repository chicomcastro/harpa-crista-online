<script>
  import { base } from '$app/paths';
  import { track } from '$lib/analytics.js';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { parseVerses, caixaNormal } from '$lib/utils.js';
  import partituras from '../../../../../data/partituras.json';

  let { data } = $props();

  const SITE = 'https://chicomcastro.github.io/harpa-crista-online';
  const { song, nome, versao, outras } = $derived(data);
  const rotulo = $derived(versao.rotulo.toLowerCase());
  const tituloApp = $derived(song.title.charAt(0) + song.title.slice(1).toLowerCase());
  const nomeDiferente = $derived(nome.localeCompare(song.title, 'pt-BR', { sensitivity: 'base' }) !== 0);
  // Primeira estrofe e coro: o suficiente para reconhecer o hino; a letra inteira fica em /song/<id>.
  const trecho = $derived.by(() => {
    const vs = parseVerses(song.content);
    const coro = vs.find(v => v.isChorus);
    return [vs[0], coro].filter((v, i, a) => v && a.indexOf(v) === i);
  });
  /*
   * Página de chegada do YouTube (#11): a de maior intenção do app. A pessoa clicou na descrição de
   * um vídeo procurando a partitura DAQUELE instrumento — então o PDF é a ação primária, acima da
   * dobra, e não um link do mesmo peso de "Abrir no YouTube".
   *
   * O componente Partituras não é usado aqui de propósito: o seletor de instrumento não faz sentido
   * numa página que já é de um instrumento. Trocar de versão é o bloco "Também para".
   *
   * A contagem de hinos sai do partituras.json, nunca escrita à mão: o canal publica 3 vídeos por
   * semana e o número muda sozinho.
   */
  const totalHinos = Object.keys(partituras.hinos).length;
  const idDrive = $derived(versao.pdf_url?.match(/\/file\/d\/([^/]+)/)?.[1] || null);
  const urlVisor = $derived(idDrive ? `https://drive.google.com/file/d/${idDrive}/preview` : null);
  let telaCheia = $state(false);
  let tocando = $state(false);

  /*
   * Esta página serve duas chegadas opostas.
   *
   * Vindo da descrição de um vídeo do YouTube, a pessoa JÁ assistiu: o que ela quer é o PDF, e por
   * isso ele é a ação primária. Vindo do card "Novo no canal" da home, ela clicou justamente para
   * ver a novidade — ali o vídeo é o conteúdo, e o PDF vem depois.
   *
   * Quem manda é o `?ver=video` que a home põe no link. A ordem é feita com `order` do flex, não
   * com dois blocos condicionais: a página é pré-renderizada e o parâmetro só existe no cliente,
   * então remontar trocaria os iframes de lugar e faria a pauta recarregar depois da hidratação.
   *
   * O `browser` não é decoração: a página é prerenderizada, e ler searchParams no servidor quebra
   * o build com "Cannot access url.searchParams on a page with prerendering enabled".
   */
  const videoPrimeiro = $derived(browser && $page.url.searchParams.get('ver') === 'video' && publicado);

  const publicado = $derived(versao.youtube_id && versao.publicado_em && versao.publicado_em <= new Date().toISOString().slice(0, 10));
  const descricao = $derived(
    `Partitura de ${nome} (hino ${song.number} da Harpa Cristã) para ${rotulo}: PDF grátis e vídeo com a partitura.` +
    (outras.length ? ` Também para ${outras.map(o => o.rotulo.toLowerCase()).join(', ')}.` : '')
  );
  const jsonLd = $derived(JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'MusicComposition',
      name: nome,
      alternateName: nomeDiferente ? tituloApp : undefined,
      identifier: `Harpa Cristã #${song.number}`,
      inLanguage: 'pt-BR',
      musicCompositionForm: 'Hymn',
      url: `${SITE}/h/${song.number}/${versao.instrumento}`
    },
    publicado ? {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `${nome} (${versao.rotulo}) - Harpa Cristã ${song.number} | Partitura`,
      description: descricao,
      thumbnailUrl: `https://i.ytimg.com/vi/${versao.youtube_id}/hqdefault.jpg`,
      uploadDate: versao.publicado_em,
      embedUrl: `https://www.youtube.com/embed/${versao.youtube_id}`,
      contentUrl: `https://www.youtube.com/watch?v=${versao.youtube_id}`
    } : null
  ].filter(Boolean)));
</script>

<svelte:head>
  <title>{nome} — Partitura para {versao.rotulo} | Hino {song.number} Harpa Cristã</title>
  <meta name="description" content={descricao} />
  <link rel="canonical" href="{SITE}/h/{song.number}/{versao.instrumento}" />
  <meta property="og:title" content="{nome} — Partitura para {versao.rotulo}" />
  <meta property="og:description" content={descricao} />
  <meta property="og:type" content="article" />
  {#if versao.youtube_id}
    <meta property="og:image" content="https://i.ytimg.com/vi/{versao.youtube_id}/hqdefault.jpg" />
  {/if}
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<div class="container mx-auto px-4 py-6 max-w-3xl">
  <p class="text-[11px] uppercase tracking-widest text-[#FF8A7A] font-semibold">Do canal Harpa Cristã Partituras</p>
  <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{nome}</h1>
  <p class="text-gray-500 dark:text-gray-400 mb-5">
    Partitura para {rotulo} · Hino {song.number}{nomeDiferente ? ` (no hinário, “${tituloApp}”)` : ''}
  </p>

  <div class="flex flex-col">
  <!-- Ação primária acima da dobra: é o que a pessoa veio buscar. -->
  <div class="flex flex-col sm:flex-row gap-2 mb-5 {videoPrimeiro ? 'order-2' : ''}">
    {#if versao.pdf_url}
      <a
        href={versao.pdf_url}
        target="_blank"
        rel="noreferrer"
        onclick={() => track('partitura_pdf_opened', { number: song.number, instrument: versao.instrumento, from: 'landing' })}
        class="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold"
      >
        <span class="mi mi-sm">download</span> Baixar PDF grátis
      </a>
    {/if}
    {#if urlVisor}
      <button
        onclick={() => { telaCheia = true; track('partitura_fullscreen_opened', { number: song.number, instrument: versao.instrumento, from: 'landing' }); }}
        class="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span class="mi mi-sm">fullscreen</span> Abrir na tela
      </button>
    {/if}
  </div>

  <!--
    A miniatura do mockup não dá: o preview do Drive vem com a barra dele junto, que em 100px de
    largura cobre a pauta. Então a prévia aparece no tamanho em que dá para ler mesmo.
  -->
  {#if urlVisor}
    <div class="relative w-full rounded-xl overflow-hidden bg-[#f7f5ef] border border-gray-200 dark:border-gray-800 mb-2 {videoPrimeiro ? 'order-3' : ''}" style="aspect-ratio: 1 / 1.1;">
      <iframe src={urlVisor} title="Partitura de {nome} para {rotulo}" loading="lazy" class="absolute inset-0 w-full h-full"></iframe>
    </div>
    <p class="text-xs text-gray-400 dark:text-gray-500 mb-8 {videoPrimeiro ? 'order-4' : ''}">
      {versao.tipo === 'arranjo' ? 'Arranjo' : 'Melodia'}{publicado ? ' · com vídeo' : ''}
    </p>
  {/if}

  {#if publicado}
    <h2 class="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2 {videoPrimeiro ? 'order-0' : ''}">{videoPrimeiro ? 'Novo no canal' : 'Ouvir online'}</h2>
    <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-8 {videoPrimeiro ? 'order-1' : ''}">
      {#if tocando}
        <iframe
          src="https://www.youtube-nocookie.com/embed/{versao.youtube_id}?autoplay=1&rel=0"
          title="{versao.rotulo} — partitura em vídeo"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          class="absolute inset-0 w-full h-full"
        ></iframe>
      {:else}
        <button onclick={() => { tocando = true; track('partitura_video_played', { number: song.number, instrument: versao.instrumento, from: 'landing' }); }} class="absolute inset-0 w-full h-full group" aria-label="Ouvir o vídeo da partitura">
          <img src="https://i.ytimg.com/vi/{versao.youtube_id}/hqdefault.jpg" alt="" loading="lazy" class="w-full h-full object-cover" />
          <span class="absolute inset-0 flex items-center justify-center">
            <span class="w-16 h-16 rounded-full bg-black/70 group-hover:bg-red-600 transition-colors flex items-center justify-center">
              <span class="mi text-white" style="font-size: 40px;">play_arrow</span>
            </span>
          </span>
        </button>
      {/if}
    </div>
  {/if}

  </div>

  {#if outras.length}
    <h2 class="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2">Também para</h2>
    <ul class="flex flex-wrap gap-2 mb-8">
      {#each outras as o (o.instrumento)}
        <li>
          <a href="{base}/h/{song.number}/{o.instrumento}" class="inline-flex items-center gap-2 min-h-[44px] px-4 text-sm rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            {o.rotulo}
            {#if o.tipo === 'arranjo'}<span class="text-[10px] font-bold uppercase tracking-wide text-[#F7B955]">Arranjo</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Letra</h2>
  <div class="font-serif text-gray-700 dark:text-gray-300 mb-3" style="line-height: 1.7;">
    {#each trecho as verse}
      <div class="mb-4 {verse.isChorus ? 'pl-4 border-l-2 border-brand-300 dark:border-brand-700' : ''}">
        {#if verse.isChorus}
          <div class="text-[11px] uppercase tracking-widest text-brand-600 dark:text-brand-400 font-semibold font-sans mb-1">Refrão</div>
        {/if}
        {#each verse.lines as line}<p>{verse.isChorus ? caixaNormal(line) : line}</p>{/each}
      </div>
    {/each}
  </div>
  <a href="{base}/song/{song.id}" class="text-sm text-brand-600 dark:text-brand-400 hover:underline">Ver a letra completa →</a>

  <!-- O que o app devolve ao canal: inscrito. A contagem vem do partituras.json, nunca à mão. -->
  <div class="mt-10 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-4">
    <div class="min-w-0">
      <div class="font-semibold text-gray-800 dark:text-gray-100">Mais {totalHinos - 1} hinos com partitura</div>
      <div class="text-sm text-gray-500 dark:text-gray-400">Inscreva-se para saber dos próximos</div>
    </div>
    <a
      href="{partituras.canal}?sub_confirmation=1"
      target="_blank"
      rel="noreferrer"
      onclick={() => track('channel_opened', { number: song.number, from: 'landing' })}
      class="shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold"
    >Inscrever-se</a>
  </div>
</div>

{#if telaCheia && urlVisor}
  <div class="fixed inset-0 z-[70] bg-gray-950 flex flex-col" role="dialog" aria-modal="true" aria-label="Partitura em tela cheia">
    <div class="flex items-center gap-3 px-3 py-2 shrink-0 text-white">
      <button onclick={() => telaCheia = false} class="w-11 h-11 -ml-1 flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Fechar partitura">
        <span class="mi">arrow_back</span>
      </button>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold truncate">{nome}</div>
        <div class="text-xs text-white/60 truncate">{versao.rotulo} · {versao.tipo === 'arranjo' ? 'arranjo' : 'melodia'}</div>
      </div>
    </div>
    <iframe src={urlVisor} title="Partitura para {versao.rotulo}" class="flex-1 w-full bg-[#f7f5ef]"></iframe>
    <div class="flex items-stretch gap-2 px-3 py-2 shrink-0 safe-bottom bg-gray-900 text-white">
      <a href={versao.pdf_url} target="_blank" rel="noreferrer" class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
        <span class="mi mi-sm">download</span> Baixar PDF
      </a>
    </div>
  </div>
{/if}

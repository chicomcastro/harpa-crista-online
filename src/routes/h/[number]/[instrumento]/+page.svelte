<script>
  import { base } from '$app/paths';
  import { parseVerses, caixaNormal } from '$lib/utils.js';
  import Partituras from '$lib/components/Partituras.svelte';

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
  <a href="{base}/song/{song.id}" class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:underline mb-4">
    <span class="mi mi-sm">arrow_back</span> Hino {song.number} — letra completa
  </a>

  <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
    {nome} — partitura para {rotulo}
  </h1>
  <p class="text-gray-600 dark:text-gray-400 mb-2">
    Hino {song.number} da Harpa Cristã{nomeDiferente ? ` (no hinário, “${tituloApp}”)` : ''}. Partitura em PDF e vídeo
    com a partitura rolando, feitos pelo canal Harpa Cristã Partituras.
  </p>

  <Partituras number={song.number} instrumento={versao.instrumento} />

  {#if outras.length}
    <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">{nome} em outros instrumentos</h2>
    <ul class="flex flex-wrap gap-2 mb-8">
      {#each outras as o (o.instrumento)}
        <li>
          <a href="{base}/h/{song.number}/{o.instrumento}" class="inline-block px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Partitura para {o.rotulo.toLowerCase()}
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
</div>

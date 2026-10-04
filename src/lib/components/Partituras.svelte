<script>
  // Vídeos e PDFs do canal Harpa Cristã Partituras para este hino. Dados em data/partituras.json,
  // gerado pelo youtube-manager (`ytm catalogo exportar`). Vídeo agendado só aparece a partir de
  // `publicado_em`; antes disso o YouTube recusa o embed.
  import { browser } from '$app/environment';
  import partituras from '../../../data/partituras.json';
  import { track } from '$lib/analytics.js';

  // `instrumento` fixa a versão inicial (páginas /h/<nº>/<instrumento>); sem ele, vale o último escolhido.
  let { number, instrumento = null } = $props();

  const CHAVE = 'hc_instrumento';
  const hoje = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local

  const versoes = $derived(
    (partituras.hinos[String(number)]?.versoes || [])
      .map(v => ({ ...v, video: v.youtube_id && (!v.publicado_em || v.publicado_em <= hoje) ? v.youtube_id : null }))
      .filter(v => v.video || v.pdf_url)
  );

  let escolhido = $state(instrumento);
  let tocando = $state(false);

  function preferido() {
    try { return browser ? localStorage.getItem(CHAVE) : null; } catch { return null; }
  }

  // Ao trocar de hino, volta para o instrumento que a pessoa usou por último (se o hino tiver).
  $effect(() => {
    if (!versoes.length) return;
    const pref = preferido();
    const inicial = instrumento || pref;
    escolhido = versoes.find(v => v.instrumento === inicial)?.instrumento || versoes[0].instrumento;
    tocando = false;
    track('partituras_shown', { number, versions: versoes.length, preferred: pref });
  });

  const atual = $derived(versoes.find(v => v.instrumento === escolhido) || versoes[0]);

  function escolher(v) {
    escolhido = v.instrumento;
    tocando = false;
    try { localStorage.setItem(CHAVE, v.instrumento); } catch {}
    track('partitura_instrument_selected', { number, instrument: v.instrumento });
  }

  function tocar() {
    tocando = true;
    track('partitura_video_played', { number, instrument: atual.instrumento, video_id: atual.video });
  }
</script>

{#if versoes.length}
  <section id="partituras" class="mt-8 mb-6 scroll-mt-20 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4" aria-labelledby="partituras-titulo">
    <div class="flex items-center justify-between gap-2 mb-3">
      <h2 id="partituras-titulo" class="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
        <span class="mi mi-sm text-brand-600 dark:text-brand-400">library_music</span> Partitura por instrumento
      </h2>
      <a
        href="{partituras.canal}?sub_confirmation=1"
        target="_blank"
        rel="noreferrer"
        onclick={() => track('channel_opened', { number, from: 'partituras' })}
        class="text-xs text-gray-500 dark:text-gray-400 hover:underline shrink-0"
      >Canal no YouTube ↗</a>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-3" role="tablist">
      {#each versoes as v (v.instrumento)}
        <button
          role="tab"
          aria-selected={v.instrumento === atual.instrumento}
          onclick={() => escolher(v)}
          class="shrink-0 px-3 py-1.5 text-sm rounded-full border transition-colors {v.instrumento === atual.instrumento
            ? 'bg-brand-600 border-brand-600 text-white'
            : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}"
        >{v.rotulo}</button>
      {/each}
    </div>

    {#if atual.video}
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-black mb-3">
        {#if tocando}
          <iframe
            src="https://www.youtube-nocookie.com/embed/{atual.video}?autoplay=1&rel=0"
            title="{atual.rotulo} — partitura em vídeo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            class="absolute inset-0 w-full h-full"
          ></iframe>
        {:else}
          <!-- Capa no lugar do player: o iframe do YouTube pesa ~1 MB e só carrega se a pessoa quiser ver. -->
          <button onclick={tocar} class="absolute inset-0 w-full h-full group" aria-label="Tocar vídeo da partitura para {atual.rotulo}">
            <img
              src="https://i.ytimg.com/vi/{atual.video}/hqdefault.jpg"
              alt=""
              loading="lazy"
              class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <span class="absolute inset-0 flex items-center justify-center">
              <span class="w-16 h-16 rounded-full bg-black/70 group-hover:bg-red-600 transition-colors flex items-center justify-center">
                <span class="mi text-white" style="font-size: 40px;">play_arrow</span>
              </span>
            </span>
          </button>
        {/if}
      </div>
    {/if}

    <div class="flex flex-wrap gap-2">
      {#if atual.pdf_url}
        <a
          href={atual.pdf_url}
          target="_blank"
          rel="noreferrer"
          onclick={() => track('partitura_pdf_opened', { number, instrument: atual.instrumento })}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 dark:bg-gray-900 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-gray-800"
        >
          <span class="mi mi-sm">download</span> Partitura em PDF
        </a>
      {/if}
      {#if atual.video}
        <a
          href="https://www.youtube.com/watch?v={atual.video}"
          target="_blank"
          rel="noreferrer"
          onclick={() => track('partitura_youtube_opened', { number, instrument: atual.instrumento, video_id: atual.video })}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Abrir no YouTube ↗
        </a>
      {/if}
    </div>
  </section>
{/if}

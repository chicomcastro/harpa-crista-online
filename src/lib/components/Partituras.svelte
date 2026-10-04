<script>
  // Vídeos e PDFs do canal Harpa Cristã Partituras para este hino. Dados em data/partituras.json,
  // gerado pelo youtube-manager (`ytm catalogo exportar`). Vídeo agendado só aparece a partir de
  // `publicado_em`; antes disso o YouTube recusa o embed.
  import { browser } from '$app/environment';
  import partituras from '../../../data/partituras.json';
  import { track } from '$lib/analytics.js';

  // `instrumento` fixa a versão inicial (páginas /h/<nº>/<instrumento>, miniatura tocada no celular);
  // sem ele, vale o último escolhido. `autoplay` já abre o player (a pessoa tocou numa miniatura).
  // `mostrar` separa as abas Partitura e Vídeo da página do hino sem duplicar o componente — duas
  // instâncias teriam cada uma a sua escolha de instrumento, e trocar de aba perderia a seleção.
  let { number, instrumento = null, autoplay = false, mostrar = 'tudo', class: classe = 'mt-8 mb-6' } = $props();

  const CHAVE = 'hc_instrumento';
  const hoje = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local

  const versoes = $derived(
    (partituras.hinos[String(number)]?.versoes || [])
      .map(v => ({ ...v, video: v.youtube_id && (!v.publicado_em || v.publicado_em <= hoje) ? v.youtube_id : null }))
      .filter(v => v.video || v.pdf_url)
  );

  /*
   * Agrupamento melodia × arranjo (#9). "Violino" é para uma pessoa; "Quarteto de Cordas" é para
   * quatro — eram chips idênticos numa faixa rolável, e o último sempre aparecia cortado ("Tror").
   *
   * O seletor é um <select> nativo de propósito: no celular ele vira a roda do sistema, nunca corta
   * rótulo, e já vem com teclado e leitor de tela de graça. Dropdown próprio custaria mais código
   * para entregar menos.
   */
  const grupos = $derived([
    { rotulo: 'Melodias', itens: versoes.filter(v => v.tipo !== 'arranjo') },
    { rotulo: 'Arranjos', itens: versoes.filter(v => v.tipo === 'arranjo') }
  ].filter(g => g.itens.length));

  let escolhido = $state(instrumento);
  let secao;
  let tocando = $state(false);

  function preferido() {
    try { return browser ? localStorage.getItem(CHAVE) : null; } catch { return null; }
  }

  // Ao trocar de hino, volta para o instrumento que a pessoa usou por último (se o hino tiver).
  $effect(() => {
    if (!versoes.length) return;
    const pref = preferido();
    const inicial = instrumento || pref;
    const v = versoes.find(v => v.instrumento === inicial) || versoes[0];
    escolhido = v.instrumento;
    tocando = autoplay && !!v.video;
    // A página de hino monta o bloco duas vezes (coluna do desktop e painel do celular); só conta o visível.
    if (secao?.offsetParent === null) return;
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

  /*
   * Visor da partitura (#5).
   *
   * A promessa do produto é ler a pauta aqui dentro, e até agora a aba entregava um thumbnail do
   * YouTube e um link para o Drive — os dois tiram a pessoa do app, e três pautas espremidas em
   * 330px são ilegíveis.
   *
   * Renderizar o PDF por conta própria (pdf.js, canvas) não dá: os arquivos moram no Drive, que não
   * manda Access-Control-Allow-Origin, então fetch é bloqueado. Mudar isso é trabalho do
   * youtube-manager, não daqui.
   *
   * Então o visor usa o /preview do próprio Drive em iframe: ele aceita ser embutido (sem
   * X-Frame-Options, conferido em 04/10/2026) e já traz zoom e virada de página. Quando os PDFs
   * saírem do Drive, troca-se só a fonte do iframe por um render nosso.
   */
  const idDrive = $derived(atual?.pdf_url?.match(/\/file\/d\/([^/]+)/)?.[1] || null);
  const urlVisor = $derived(idDrive ? `https://drive.google.com/file/d/${idDrive}/preview` : null);

  let telaCheia = $state(false);

  function abrirTelaCheia() {
    telaCheia = true;
    track('partitura_fullscreen_opened', { number, instrument: atual.instrumento });
  }

  // Esc fecha, e o fundo não rola enquanto o visor está aberto.
  $effect(() => {
    if (!telaCheia || !browser) return;
    const onKey = (e) => { if (e.key === 'Escape') telaCheia = false; };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener('keydown', onKey);
    };
  });
</script>

{#if versoes.length}
  <section bind:this={secao} class="{classe} rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4" aria-label="Partitura por instrumento">
    <div class="flex items-center justify-between gap-2 mb-3">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
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

    <div class="flex items-center justify-between gap-3 mb-3">
      <label class="sr-only" for="versao-{number}">Instrumento</label>
      <select
        id="versao-{number}"
        value={atual.instrumento}
        onchange={(e) => escolher(versoes.find(v => v.instrumento === e.currentTarget.value))}
        class="min-w-0 max-w-full px-3 py-2 pr-8 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
      >
        {#each grupos as g (g.rotulo)}
          <optgroup label={g.rotulo}>
            {#each g.itens as v (v.instrumento)}
              <option value={v.instrumento}>{v.rotulo}</option>
            {/each}
          </optgroup>
        {/each}
      </select>
      <div class="text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 leading-tight">
        <div>{atual.tipo === 'arranjo' ? 'Arranjo' : 'Melodia'}</div>
        <div>{versoes.indexOf(atual) + 1} de {versoes.length} {versoes.length === 1 ? 'versão' : 'versões'}</div>
      </div>
    </div>

    {#if urlVisor && mostrar !== 'video'}
      <!-- A pauta é o conteúdo principal da aba; o vídeo tem aba própria. -->
      <div class="relative w-full rounded-lg overflow-hidden bg-[#f7f5ef] mb-3" style="aspect-ratio: 1 / 1.1;">
        <iframe
          src={urlVisor}
          title="Partitura de {partituras.hinos[String(number)]?.nome || `hino ${number}`} para {atual.rotulo}"
          loading="lazy"
          class="absolute inset-0 w-full h-full"
        ></iframe>
      </div>
      <button
        onclick={abrirTelaCheia}
        class="w-full mb-3 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
      >
        <span class="mi mi-sm">fullscreen</span> Abrir na tela
      </button>
    {/if}

    {#if atual.video && mostrar !== 'partitura'}
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-black mb-3">
        <!-- Continua atrás de um toque mesmo na aba Vídeo: o embed pesa ~1 MB, e trocar de aba não
             deveria soltar som sozinho. -->
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
          <button onclick={tocar} class="absolute inset-0 w-full h-full group" aria-label="Ouvir com o vídeo da partitura para {atual.rotulo}">
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
          <span class="mi mi-sm">download</span> Baixar PDF
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
          Ver no canal ↗
        </a>
      {/if}
    </div>
  </section>

  {#if telaCheia && urlVisor}
    <!-- Fechar fica no canto esquerdo: no painel antigo ele caía em cima do link do canal. -->
    <div class="fixed inset-0 z-[70] bg-gray-950 flex flex-col" role="dialog" aria-modal="true" aria-label="Partitura em tela cheia">
      <div class="flex items-center gap-3 px-3 py-2 shrink-0 text-white">
        <button onclick={() => telaCheia = false} class="w-11 h-11 -ml-1 flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Fechar partitura">
          <span class="mi">arrow_back</span>
        </button>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold truncate">{partituras.hinos[String(number)]?.nome || `Hino ${number}`}</div>
          <div class="text-xs text-white/60 truncate">{atual.rotulo} · {atual.tipo === 'arranjo' ? 'arranjo' : 'melodia'}</div>
        </div>
      </div>

      <!-- min-h-0 é o que deixa a pauta encolher quando o vídeo abre; sem isso o flex-1 ignora o
           espaço que o vídeo ocupa. -->
      <iframe src={urlVisor} title="Partitura para {atual.rotulo}" class="flex-1 min-h-0 w-full bg-[#f7f5ef]"></iframe>

      {#if tocando && atual.video}
        <!--
          O vídeo é limitado por ALTURA, não por largura. Com w-full + aspect-video ele virava
          745px num desktop de 1324px e empurrava o dock (com o "Fechar vídeo") para fora da tela:
          depois de abrir, não dava mais para fechar.
        -->
        <div class="relative shrink-0 mx-auto h-[38vh] max-w-full aspect-video">
          <iframe
            src="https://www.youtube-nocookie.com/embed/{atual.video}?autoplay=1&rel=0"
            title="{atual.rotulo} — partitura em vídeo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            class="absolute inset-0 w-full h-full"
          ></iframe>
          <button
            onclick={() => tocando = false}
            class="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white"
            aria-label="Fechar vídeo"
          ><span class="mi mi-sm">close</span></button>
        </div>
      {/if}

      <div class="flex items-stretch gap-2 px-3 py-2 shrink-0 safe-bottom bg-gray-900 text-white overflow-x-auto">
        {#if atual.video}
          <button onclick={() => tocando ? tocando = false : tocar()} class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
            <span class="mi mi-sm">{tocando ? 'close' : 'play_arrow'}</span>{tocando ? 'Fechar vídeo' : 'Ouvir com o vídeo'}
          </button>
        {/if}
        <a href={atual.pdf_url} target="_blank" rel="noreferrer"
          onclick={() => track('partitura_pdf_opened', { number, instrument: atual.instrumento, from: 'fullscreen' })}
          class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
          <span class="mi mi-sm">download</span> Baixar PDF
        </a>
        {#if atual.video}
          <a href="https://www.youtube.com/watch?v={atual.video}" target="_blank" rel="noreferrer"
            onclick={() => track('partitura_youtube_opened', { number, instrument: atual.instrumento, from: 'fullscreen' })}
            class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
            Ver no canal ↗
          </a>
        {/if}
      </div>
    </div>
  {/if}
{/if}

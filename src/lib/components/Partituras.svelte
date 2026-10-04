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
  <!--
    Sem card: a pauta e o vídeo ficam direto no fundo, como a letra. A borda e o padding só
    empilhavam uma moldura em volta do que já é o conteúdo da aba.
  -->
  <section bind:this={secao} class={classe} aria-label="Partitura por instrumento">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <label class="sr-only" for="versao-{number}">Instrumento</label>
        <!-- appearance-none + seta própria: a nativa ficava espremida na borda do campo. -->
        <select
          id="versao-{number}"
          value={atual.instrumento}
          onchange={(e) => escolher(versoes.find(v => v.instrumento === e.currentTarget.value))}
          class="appearance-none min-w-0 max-w-full h-11 pl-3 pr-9 font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 bg-no-repeat"
          style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E&quot;); background-position: right 0.6rem center; background-size: 1rem;"
        >
          {#each grupos as g (g.rotulo)}
            <optgroup label={g.rotulo}>
              {#each g.itens as v (v.instrumento)}
                <option value={v.instrumento}>{v.rotulo}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
        <span class="text-xs text-gray-500 dark:text-gray-400 leading-tight hidden sm:block">
          {atual.tipo === 'arranjo' ? 'Arranjo' : 'Melodia'} · {versoes.indexOf(atual) + 1} de {versoes.length}
        </span>
      </div>
      <a
        href="{partituras.canal}?sub_confirmation=1"
        target="_blank"
        rel="noreferrer"
        onclick={() => track('channel_opened', { number, from: 'partituras' })}
        class="text-xs text-gray-500 dark:text-gray-400 hover:underline shrink-0"
      >Canal no YouTube ↗</a>
    </div>

    <!-- No desktop a pauta e o vídeo dividem a largura, em vez do vídeo empilhado embaixo. -->
    <div class="{urlVisor && atual.video && mostrar === 'tudo' ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start' : ''}">
      {#if urlVisor && mostrar !== 'video'}
        <div class="relative w-full rounded-lg overflow-hidden bg-[#f7f5ef] mb-3" style="aspect-ratio: 1 / 1.1;">
          <iframe
            src={urlVisor}
            title="Partitura de {partituras.hinos[String(number)]?.nome || `hino ${number}`} para {atual.rotulo}"
            loading="lazy"
            class="absolute inset-0 w-full h-full"
          ></iframe>
          <!-- Em cima e à direita: embaixo a barra do próprio Drive cobria o botão. -->
          <button
            onclick={abrirTelaCheia}
            class="absolute top-2 right-2 inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-gray-900/85 hover:bg-gray-900 text-white text-sm font-medium backdrop-blur-sm"
          >
            <span class="mi mi-sm">fullscreen</span> Abrir na tela
          </button>
        </div>
      {/if}

      {#if atual.video && mostrar !== 'partitura' && !telaCheia}
        <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-black mb-3">
          <!-- Atrás de um toque: o embed pesa ~1 MB, e trocar de aba não deveria soltar som sozinho.
               `!telaCheia` acima evita dois players ao mesmo tempo — era o motivo de pausar no visor
               e o áudio continuar tocando por baixo. -->
          {#if tocando}
            <iframe
              src="https://www.youtube-nocookie.com/embed/{atual.video}?autoplay=1&rel=0"
              title="{atual.rotulo} — partitura em vídeo"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen
              class="absolute inset-0 w-full h-full"
            ></iframe>
          {:else}
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
    </div>

    <div class="flex flex-wrap gap-2">
      {#if atual.pdf_url}
        <a
          href={atual.pdf_url}
          target="_blank"
          rel="noreferrer"
          onclick={() => track('partitura_pdf_opened', { number, instrument: atual.instrumento })}
          class="inline-flex items-center gap-1.5 h-10 px-3 text-sm rounded-lg border bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 dark:bg-gray-900 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-gray-800"
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
          class="inline-flex items-center gap-1.5 h-10 px-3 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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

      <iframe src={urlVisor} title="Partitura para {atual.rotulo}" class="flex-1 min-h-0 w-full bg-[#f7f5ef]"></iframe>

      {#if tocando && atual.video}
        <!--
          No desktop o vídeo flutua à direita, como o player do Cifra Club: a pauta continua com a
          largura inteira e nunca é re-renderizada ao abrir ou fechar o vídeo — reposicionar o
          iframe do Drive faz ele recarregar e piscar em branco.

          No celular ele vai para o fluxo, limitado por ALTURA (38vh): com largura cheia +
          aspect-video ele empurrava o dock, com o "Fechar vídeo", para fora da tela.
        -->
        <div class="relative shrink-0 mx-auto max-w-full h-[38vh] aspect-video
                    lg:absolute lg:right-4 lg:bottom-20 lg:h-auto lg:w-[38vw] lg:max-w-[640px] lg:shadow-2xl lg:rounded-xl lg:overflow-hidden">
          <iframe
            src="https://www.youtube-nocookie.com/embed/{atual.video}?autoplay=1&rel=0"
            title="{atual.rotulo} — partitura em vídeo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            class="absolute inset-0 w-full h-full lg:static lg:w-full lg:aspect-video lg:h-auto"
          ></iframe>
          <button
            onclick={() => tocando = false}
            class="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white"
            aria-label="Fechar vídeo"
          ><span class="mi mi-sm">close</span></button>
        </div>
      {/if}

      <!-- Sem overflow-x: com os rótulos curtos no celular os três cabem, e um dock que rola
           esconde ação — foi o que cortou o "Ver no canal" em 375px. -->
      <div class="flex items-stretch justify-center gap-2 px-3 py-2 shrink-0 safe-bottom bg-gray-900 text-white">
        {#if atual.video}
          <button onclick={() => tocando ? tocando = false : tocar()} class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
            <span class="mi mi-sm">{tocando ? 'close' : 'play_arrow'}</span><span class="hidden sm:inline">{tocando ? 'Fechar vídeo' : 'Ver com o vídeo'}</span><span class="sm:hidden">{tocando ? 'Fechar' : 'Vídeo'}</span>
          </button>
        {/if}
        <a href={atual.pdf_url} target="_blank" rel="noreferrer"
          onclick={() => track('partitura_pdf_opened', { number, instrument: atual.instrumento, from: 'fullscreen' })}
          class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
          <span class="mi mi-sm">download</span><span class="hidden sm:inline">Baixar </span>PDF
        </a>
        {#if atual.video}
          <a href="https://www.youtube.com/watch?v={atual.video}" target="_blank" rel="noreferrer"
            onclick={() => track('partitura_youtube_opened', { number, instrument: atual.instrumento, from: 'fullscreen' })}
            class="flex items-center gap-1.5 px-3 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm whitespace-nowrap">
            <span class="hidden sm:inline">Ver no </span>Canal ↗
          </a>
        {/if}
      </div>
    </div>
  {/if}
{/if}

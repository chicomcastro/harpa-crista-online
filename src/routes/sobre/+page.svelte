<script>
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Sobre — Harpa Cristã Online</title>
  <meta name="description" content="Harpa Cristã Online: todos os 640 hinos com busca inteligente, favoritos, modo apresentação, listas de culto e funcionamento offline. Grátis e sem login." />
  <meta property="og:title" content="Harpa Cristã Online — 640 hinos" />
  <meta property="og:description" content="Busca, favoritos, modo apresentação, listas de culto, offline. Sem login, sem anúncios." />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-3xl">
  <!-- Hero -->
  <section class="text-center mb-16">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400 text-xs font-semibold uppercase tracking-widest mb-4">
      <span class="mi mi-sm">music_note</span> 640 hinos
    </div>
    <h1 class="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-gray-100 leading-tight mb-4">
      A Harpa Cristã<br/>como você nunca viu
    </h1>
    <p class="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
      Todos os 640 hinos da Harpa Cristã num app rápido, offline e feito para o uso real no culto.
    </p>
    <div class="mt-8 flex gap-3 justify-center">
      <a href="{base}/" class="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
        Abrir o hinário
      </a>
      <a href="{base}/playlists" class="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
        Ver listas
      </a>
    </div>
  </section>

  <!-- Features -->
  <section class="grid gap-4 sm:grid-cols-2 mb-16">
    {#each [
      { icon: 'search', title: 'Busca por número, título ou trecho', body: 'Pastor pediu o "hino 47" ou só lembra de um verso? Digite e Enter — vai direto.' },
      { icon: 'present_to_all', title: 'Modo apresentação', body: 'Fonte gigante, fundo escuro, verso a verso. Coro se repete automaticamente.' },
      { icon: 'queue_music', title: 'Listas de culto', body: 'Monte a ordem da semana e compartilhe o link com a equipe. Sem cadastro.' },
      { icon: 'favorite', title: 'Favoritos que vão com você', body: 'Salvos no seu aparelho. Gere link pra sincronizar com outro dispositivo.' },
      { icon: 'image', title: 'Compartilhe como imagem', body: 'Cada verso vira PNG pronto pra WhatsApp e Stories.' },
      { icon: 'cloud_off', title: 'Funciona offline', body: 'Igreja com sinal ruim? Depois da primeira visita, o app abre sem internet.' }
    ] as f}
      <div class="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <span class="mi text-brand-600 dark:text-brand-400 mb-2 block">{f.icon}</span>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-1">{f.title}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
      </div>
    {/each}
  </section>

  <!-- Principles -->
  <section class="mb-16">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Princípios</h2>
    <ul class="space-y-4 text-gray-600 dark:text-gray-300">
      <li class="flex gap-3">
        <span class="mi mi-sm text-brand-600 dark:text-brand-400 mt-0.5">check</span>
        <div>
          <strong class="text-gray-800 dark:text-gray-100">Gratuito e sem anúncios.</strong>
          Não paga pra usar, não é interrompido.
        </div>
      </li>
      <li class="flex gap-3">
        <span class="mi mi-sm text-brand-600 dark:text-brand-400 mt-0.5">check</span>
        <div>
          <strong class="text-gray-800 dark:text-gray-100">Sem login, sem rastreio invasivo.</strong>
          Seus favoritos e listas ficam no seu aparelho.
        </div>
      </li>
      <li class="flex gap-3">
        <span class="mi mi-sm text-brand-600 dark:text-brand-400 mt-0.5">check</span>
        <div>
          <strong class="text-gray-800 dark:text-gray-100">Feito pro culto.</strong>
          Pensado pra quem rege, projeta, acompanha no banco — não pra decorar apresentação de powerpoint.
        </div>
      </li>
      <li class="flex gap-3">
        <span class="mi mi-sm text-brand-600 dark:text-brand-400 mt-0.5">check</span>
        <div>
          <strong class="text-gray-800 dark:text-gray-100">Código aberto.</strong>
          Contribuições e sugestões no <a href="https://github.com/chicomcastro/harpa-crista-online" class="underline text-brand-600 dark:text-brand-400">GitHub</a>.
        </div>
      </li>
    </ul>
  </section>

  <!-- FAQ -->
  <section class="mb-16">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Perguntas frequentes</h2>
    <div class="space-y-4">
      {#each [
        { q: 'Tem todos os 640 hinos?', a: 'Sim, a edição completa. Letras revisadas.' },
        { q: 'Tem os áudios?', a: 'Sim, cada hino tem um player com o áudio instrumental (quando disponível).' },
        { q: 'E as cifras/partituras?', a: 'Ainda não integradas. No roadmap. Por enquanto, a página do hino traz link para partitura em PDF (quando existe fonte aberta).' },
        { q: 'Precisa baixar da loja?', a: 'Não — abre no navegador. No celular, use "Adicionar à tela inicial" e vira um ícone como qualquer app.' },
        { q: 'Meus favoritos somem se eu limpar o navegador?', a: 'Sim, ficam no localStorage. Antes de limpar, clique em "Compartilhar favoritos" para exportar o link.' }
      ] as item}
        <details class="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <summary class="flex items-center justify-between gap-4 p-4 cursor-pointer list-none">
            <span class="font-semibold text-gray-800 dark:text-gray-100">{item.q}</span>
            <span class="mi mi-sm text-gray-400 group-open:rotate-180 transition-transform">chevron_right</span>
          </summary>
          <p class="px-4 pb-4 text-sm text-gray-500 dark:text-gray-400">{item.a}</p>
        </details>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <section class="text-center p-8 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border border-brand-200 dark:border-gray-800">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Começa hoje</h2>
    <p class="text-gray-600 dark:text-gray-300 mb-6">O hinário que o seu culto merece — direto no navegador.</p>
    <a href="{base}/" class="inline-block px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
      Abrir Harpa Cristã
    </a>
  </section>
</div>

<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let platform = $state('other');

  onMount(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
    else if (/android/.test(ua)) platform = 'android';
  });
</script>

<svelte:head>
  <title>Harpa Cristã Online — 640 hinos grátis, offline e sem anúncios</title>
  <meta name="description" content="O hinário da Harpa Cristã completo no seu bolso. 640 hinos com busca, áudio, modo apresentação, listas de culto e funcionamento offline. Grátis, sem login, sem anúncios." />
  <meta property="og:title" content="Harpa Cristã Online — 640 hinos" />
  <meta property="og:description" content="Todos os 640 hinos num app rápido, offline e sem anúncios. Feito para o culto real." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://chicomcastro.github.io/harpa-crista-online/inicio" />
  <link rel="canonical" href="https://chicomcastro.github.io/harpa-crista-online/inicio" />
</svelte:head>

<div class="relative overflow-hidden">
  <!-- Decorative gradient -->
  <div class="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-brand-50 via-brand-50/40 to-transparent dark:from-brand-950/40 dark:via-gray-950 dark:to-transparent -z-10"></div>

  <div class="container mx-auto px-4 max-w-5xl">
    <!-- Hero -->
    <section class="pt-10 sm:pt-20 pb-16 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-900 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 text-xs font-semibold uppercase tracking-widest mb-6 shadow-sm">
        <span class="mi mi-sm">music_note</span> 640 hinos · grátis · offline
      </div>
      <h1 class="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-gray-50 leading-tight mb-5 tracking-tight">
        A Harpa Cristã<br/>
        <span class="bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400 bg-clip-text text-transparent">que o seu culto merece</span>
      </h1>
      <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
        Todos os 640 hinos num app rápido, com busca inteligente, áudio, modo apresentação e funcionamento offline. Sem login, sem anúncios.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a href="{base}/" class="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-0.5">
          Abrir o hinário →
        </a>
        <a href="#instalar" class="w-full sm:w-auto px-8 py-4 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:border-brand-400 dark:hover:border-brand-600 transition-colors">
          Instalar no celular
        </a>
      </div>
      <p class="mt-6 text-sm text-gray-400 dark:text-gray-500">
        Não precisa baixar da loja. Abre direto no navegador.
      </p>
    </section>

    <!-- Visual preview -->
    <section class="mb-24">
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative overflow-hidden">
          <div class="text-xs uppercase tracking-wider text-brand-600 dark:text-brand-400 font-semibold mb-2">Busca instantânea</div>
          <div class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">"Hino 47"? "Castelo forte"? "Graça sublime"?</div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">Digite o número, o título, ou um verso que lembrar — e Enter. Vai direto pro hino certo, sem mais de um toque.</p>
          <div class="mt-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <span class="mi text-gray-400">search</span>
            <span class="text-sm text-gray-400">graça sublime</span>
          </div>
        </div>
        <div class="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold mb-2">Modo apresentação</div>
          <div class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Fonte gigante. Verso a verso.</div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">Coro se repete automaticamente. Fullscreen, swipe, setas no teclado.</p>
          <div class="mt-5 h-16 rounded-xl bg-gray-900 dark:bg-black text-gray-100 flex items-center justify-center text-sm font-serif">
            Castelo forte é nosso Deus
          </div>
        </div>
      </div>
    </section>

    <!-- Features grid -->
    <section class="mb-24">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-50 text-center mb-3">Feito pro culto real</h2>
      <p class="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">Não é uma conversão de PDF nem app cheio de anúncio. É uma ferramenta pensada pra quem canta, rege, projeta e acompanha no banco.</p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each [
          { icon: 'bolt', title: 'Abre em milissegundos', body: 'App leve e estático. Carrega instantâneo mesmo em 3G.' },
          { icon: 'cloud_off', title: 'Funciona offline', body: 'Depois da primeira visita, abre sem internet. Igreja com sinal ruim? Tranquilo.' },
          { icon: 'queue_music', title: 'Listas de culto', body: 'Monte a ordem da semana, compartilhe o link com a equipe. Sem cadastro.' },
          { icon: 'present_to_all', title: 'Modo apresentação', body: 'Projete o hino com fonte grande, fundo escuro. Coro automático.' },
          { icon: 'favorite', title: 'Favoritos com você', body: 'Salvos no seu aparelho. Exporte via link pra outro dispositivo.' },
          { icon: 'headphones', title: 'Áudio embutido', body: 'Cada hino tem um player com áudio instrumental (quando disponível).' },
          { icon: 'image', title: 'Imagem pra stories', body: 'Qualquer verso vira PNG pronto pra WhatsApp, Instagram e Stories.' },
          { icon: 'dark_mode', title: 'Modo escuro', body: 'Segue sua preferência de sistema ou ajuste manual.' },
          { icon: 'lock_open', title: 'Código aberto', body: 'Sem tracking invasivo, sem login, sem anúncios. Para sempre.' }
        ] as f}
          <div class="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <span class="mi mi-lg text-brand-600 dark:text-brand-400 mb-3 block">{f.icon}</span>
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-1">{f.title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- How it works -->
    <section class="mb-24">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-50 text-center mb-10">Em 30 segundos</h2>
      <div class="grid sm:grid-cols-3 gap-6">
        {#each [
          { n: '1', title: 'Abre o app', body: 'Direto no navegador. Nada pra baixar, nenhum cadastro.' },
          { n: '2', title: 'Encontra o hino', body: 'Busca por número, título ou um pedaço da letra que lembrar.' },
          { n: '3', title: 'Canta, projeta ou compartilha', body: 'Modo apresentação pra reger, imagem pra stories, lista pra equipe.' }
        ] as step}
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-lg mb-4">{step.n}</div>
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-2">{step.title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{step.body}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Install PWA -->
    <section id="instalar" class="mb-24 p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-black text-white">
      <div class="max-w-2xl">
        <div class="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-brand-300 font-semibold mb-3">
          <span class="mi mi-sm">install_mobile</span> Instalar como app
        </div>
        <h2 class="text-3xl font-bold mb-4">Adicione à tela inicial</h2>
        <p class="text-gray-300 mb-8">Depois de instalado, abre direto como um app nativo — sem barra do navegador, sem perder tempo digitando URL.</p>

        <div class="grid sm:grid-cols-2 gap-6">
          <div class="p-5 rounded-xl bg-white/5 border border-white/10">
            <div class="text-sm font-semibold text-brand-300 mb-2 flex items-center gap-2">
              <span class="mi mi-sm">phone_iphone</span> iPhone / iPad
            </div>
            <ol class="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>Abra o app no <strong>Safari</strong></li>
              <li>Toque no botão <strong>Compartilhar</strong></li>
              <li>Escolha <strong>"Adicionar à Tela de Início"</strong></li>
            </ol>
          </div>
          <div class="p-5 rounded-xl bg-white/5 border border-white/10">
            <div class="text-sm font-semibold text-brand-300 mb-2 flex items-center gap-2">
              <span class="mi mi-sm">phone_android</span> Android
            </div>
            <ol class="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>Abra no <strong>Chrome</strong></li>
              <li>Toque no menu <strong>⋮</strong></li>
              <li>Escolha <strong>"Instalar app"</strong></li>
            </ol>
          </div>
        </div>

        <div class="mt-8">
          <a href="{base}/" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors">
            Abrir o app agora →
          </a>
        </div>
      </div>
    </section>

    <!-- Principles -->
    <section class="mb-24">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-50 text-center mb-10">Nossos princípios</h2>
      <div class="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {#each [
          { title: 'Gratuito pra sempre', body: 'Sem assinatura, sem paywall, sem "versão premium".' },
          { title: 'Sem anúncios', body: 'Nada de banner, popup ou vídeo interrompendo o culto.' },
          { title: 'Sem cadastro', body: 'Seus favoritos e listas ficam no seu aparelho, não num servidor.' },
          { title: 'Código aberto', body: 'Todo o código está no GitHub. Sugestões e contribuições bem-vindas.' }
        ] as p}
          <div class="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <span class="mi text-green-600 dark:text-green-400 shrink-0">check_circle</span>
            <div>
              <strong class="text-gray-800 dark:text-gray-100 block">{p.title}</strong>
              <span class="text-sm text-gray-500 dark:text-gray-400">{p.body}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Final CTA -->
    <section class="mb-20 text-center p-10 sm:p-16 rounded-2xl border border-brand-200 dark:border-brand-800 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/40 dark:to-purple-950/40">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">Pronto pra começar?</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">640 hinos. Grátis. Funciona offline. É só abrir.</p>
      <a href="{base}/" class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-0.5">
        Abrir Harpa Cristã →
      </a>
    </section>

    <!-- Footer -->
    <footer class="pb-12 text-center text-xs text-gray-400 dark:text-gray-600">
      <div class="flex items-center justify-center gap-3 mb-2">
        <a href="{base}/sobre" class="hover:text-brand-600 dark:hover:text-brand-400">Sobre</a>
        <span>·</span>
        <a href="https://github.com/chicomcastro/harpa-crista-online" class="hover:text-brand-600 dark:hover:text-brand-400">GitHub</a>
      </div>
      <p>Textos pertencem à CPAD. Projeto independente, sem fins lucrativos.</p>
    </footer>
  </div>
</div>

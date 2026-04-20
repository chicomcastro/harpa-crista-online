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
  <title>Harpa Cristã Online — 640 hinos grátis no seu celular</title>
  <meta name="description" content="Todos os 640 hinos da Harpa Cristã no seu celular. Com áudio, letra grande pra projetar e busca pra achar qualquer hino em segundos. Grátis e sem anúncios." />
  <meta property="og:title" content="Harpa Cristã Online — 640 hinos" />
  <meta property="og:description" content="Todos os 640 hinos no seu celular. Com áudio, busca e letra grande pra projetar. Grátis e sem anúncios." />
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
        <span class="mi mi-sm">music_note</span> 640 hinos · grátis · sem internet
      </div>
      <h1 class="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-gray-50 leading-tight mb-5 tracking-tight">
        A Harpa Cristã<br/>
        <span class="bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400 bg-clip-text text-transparent">sempre com você</span>
      </h1>
      <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
        Todos os 640 hinos no seu celular. Com áudio pra ouvir, letra grande pra projetar e busca pra achar qualquer hino em segundos.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a href="{base}/" class="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-0.5">
          Abrir o hinário →
        </a>
        <a href="#instalar" class="w-full sm:w-auto px-8 py-4 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:border-brand-400 dark:hover:border-brand-600 transition-colors">
          Como colocar no celular
        </a>
      </div>
      <p class="mt-6 text-sm text-gray-400 dark:text-gray-500">
        Não precisa baixar na loja. É só abrir o link.
      </p>
    </section>

    <!-- Visual preview -->
    <section class="mb-24">
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative overflow-hidden">
          <div class="text-xs uppercase tracking-wider text-brand-600 dark:text-brand-400 font-semibold mb-2">Achar hino é fácil</div>
          <div class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">"Hino 47"? "Castelo forte"? "Graça sublime"?</div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">Digite o número, o nome ou um pedacinho da letra que você lembrar. O hino abre na hora.</p>
          <div class="mt-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <span class="mi text-gray-400">search</span>
            <span class="text-sm text-gray-400">graça sublime</span>
          </div>
        </div>
        <div class="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold mb-2">Pra projetar no culto</div>
          <div class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Letra grande, verso por verso.</div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">O coro aparece sozinho depois de cada estrofe. Dá pra passar com o dedo ou com as setas do teclado.</p>
          <div class="mt-5 h-16 rounded-xl bg-gray-900 dark:bg-black text-gray-100 flex items-center justify-center text-sm font-serif">
            Castelo forte é nosso Deus
          </div>
        </div>
      </div>
    </section>

    <!-- Features grid -->
    <section class="mb-24">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-50 text-center mb-3">Pensado pro dia a dia da igreja</h2>
      <p class="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">Feito pra quem canta no banco, pra quem rege o coral, pra quem projeta no telão. Simples de usar, sem enrolação.</p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each [
          { icon: 'bolt', title: 'Abre rapidinho', body: 'Carrega na hora, mesmo quando a internet tá lenta.' },
          { icon: 'cloud_off', title: 'Funciona sem internet', body: 'Depois que você abre pela primeira vez, ele continua funcionando mesmo sem sinal. Igreja no interior? Sem problema.' },
          { icon: 'queue_music', title: 'Monte a ordem do culto', body: 'Organize os hinos da semana e envie o link pra equipe. Não precisa criar conta.' },
          { icon: 'present_to_all', title: 'Projete no telão', body: 'Letra gigante, fundo escuro, um verso de cada vez. O coro já aparece sozinho.' },
          { icon: 'favorite', title: 'Seus hinos favoritos', body: 'Marque os que você mais canta. Ficam salvos no seu celular.' },
          { icon: 'headphones', title: 'Ouça o hino', body: 'Cada hino tem o áudio pra você acompanhar a melodia.' },
          { icon: 'image', title: 'Compartilhe como imagem', body: 'Transforme qualquer verso numa imagem bonita pra enviar no WhatsApp ou postar nos Stories.' },
          { icon: 'dark_mode', title: 'Modo escuro', body: 'Mais confortável pra ler à noite ou em ambientes sem muita luz.' },
          { icon: 'lock_open', title: 'Sem pegadinhas', body: 'Sem assinatura, sem anúncio, sem cadastro. E continua assim pra sempre.' }
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
          { n: '1', title: 'Abre o link', body: 'Não precisa baixar nada nem criar conta. É só clicar e usar.' },
          { n: '2', title: 'Acha seu hino', body: 'Pesquise pelo número, pelo nome ou por um trecho que você lembrar.' },
          { n: '3', title: 'Cante, projete, compartilhe', body: 'Use no culto, mande pro grupo da igreja ou guarde nos favoritos.' }
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
          <span class="mi mi-sm">install_mobile</span> Coloque no celular
        </div>
        <h2 class="text-3xl font-bold mb-4">Fica igualzinho a um app</h2>
        <p class="text-gray-300 mb-8">Depois de adicionar à tela inicial, vira um atalho bonito como qualquer outro app. Toca no ícone e já abre o hinário.</p>

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
          { title: 'Grátis pra sempre', body: 'Você não paga nada. Nem agora, nem depois.' },
          { title: 'Sem anúncios', body: 'Nada de propaganda atrapalhando na hora do louvor.' },
          { title: 'Sem cadastro', body: 'Não precisa criar conta, não pedimos seu e-mail. Seus favoritos ficam no seu celular.' },
          { title: 'Aberto à comunidade', body: 'É um projeto independente. Sugestões e ajuda são bem-vindas.' }
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
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">Pronto pra cantar?</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">640 hinos no seu bolso. Grátis. É só abrir e começar.</p>
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

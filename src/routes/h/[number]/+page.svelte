<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let { data } = $props();
  const target = data.song ? `${base}/song/${data.song.id}` : `${base}/`;

  onMount(() => {
    goto(target + location.search, { replaceState: true });
  });
</script>

<svelte:head>
  {#if data.song}
    <title>{data.song.number}. {data.song.title} — Harpa Cristã Online</title>
    <meta property="og:title" content="Hino {data.song.number} — {data.song.title} | Harpa Cristã" />
    <meta name="description" content="Letra do hino {data.song.number} da Harpa Cristã: {data.song.title}." />
    <link rel="canonical" href="https://chicomcastro.github.io/harpa-crista-online/song/{data.song.id}" />
  {/if}
  <!-- Script antes do meta refresh: o refresh descarta a query (?yt=<nº>-<instrumento>) que marca a origem no Amplitude.
       O meta continua para quem não roda JS (preview de link). -->
  {@html `<script>location.replace(${JSON.stringify(target)} + location.search)</script>`}
  <meta http-equiv="refresh" content="0; url={target}" />
</svelte:head>

<div class="container mx-auto px-4 py-16 text-center">
  <p class="text-gray-500 dark:text-gray-400">Abrindo hino…</p>
</div>

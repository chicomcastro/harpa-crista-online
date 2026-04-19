<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { songs } from '$lib/stores.js';

  onMount(() => {
    const num = parseInt($page.params.number);
    const song = songs.find(s => s.number === num);
    if (song) {
      goto(`${base}/song/${song.id}`, { replaceState: true });
    } else {
      goto(`${base}/`, { replaceState: true });
    }
  });
</script>

<div class="container mx-auto px-4 py-16 text-center">
  <p class="text-gray-500 dark:text-gray-400">Abrindo hino…</p>
</div>

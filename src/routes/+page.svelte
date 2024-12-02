<script>
  import { onMount } from 'svelte';
  
  let songs = [];
  
  onMount(async () => {
    const response = await fetch('/api/songs');
    songs = await response.json();
  });
</script>

<main class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6 text-center">Harpa Cristã Online</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each songs as song}
      <a 
        href={`/song/${encodeURIComponent(song.id)}`}
        class="p-4 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
      >
        <div class="flex items-start gap-2">
          <span class="text-lg font-semibold text-gray-600">#{song.number}</span>
          <h2 class="text-xl font-semibold text-gray-800">{song.title}</h2>
        </div>
      </a>
    {/each}
  </div>

  {#if songs.length === 0}
    <p class="text-center text-gray-600 mt-8">Carregando músicas...</p>
  {/if}
</main>

<style>
  :global(body) {
    background-color: #f9fafb;
  }
</style>

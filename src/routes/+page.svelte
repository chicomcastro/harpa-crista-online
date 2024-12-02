<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let songs = [];
  let searchQuery = "";
  let filteredSongs = [];

  onMount(async () => {
    const response = await fetch("/api/songs");
    songs = await response.json();
    applySearchQuery(searchQuery);
  });

  // Atualiza a URL quando a searchQuery mudar
  $: {
    if (browser) {
      const url = new URL($page.url);
      if (searchQuery) {
        url.searchParams.set("q", searchQuery);
      } else {
        url.searchParams.delete("q");
      }
      goto(url, { replaceState: true, keepFocus: true });
    }
  }

  // Reagir às mudanças na URL
  $: {
    const urlSearchQuery = $page.url.searchParams.get("q");
    if (urlSearchQuery) {
      searchQuery = urlSearchQuery;
    }
  }

  // Filtra as músicas baseado na searchQuery
  $: {
    applySearchQuery(searchQuery);
  }

  function applySearchQuery(searchQuery) {
    if (searchQuery) {
      filteredSongs = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      filteredSongs = songs;
    }
  }
</script>

<main class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6 text-center">Harpa Cristã Online</h1>

  <div class="search-container">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Pesquisar música por título ou conteúdo..."
      class="search-input"
    />
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each filteredSongs as song}
      <a
        href={`/song/${encodeURIComponent(song.id)}`}
        class="p-4 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
      >
        <div class="flex items-start gap-2">
          <span class="text-lg font-semibold text-gray-600">#{song.number}</span
          >
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

  .search-container {
    margin: 1rem 0;
    width: 100%;
  }

  .search-input {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #666;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  }
</style>

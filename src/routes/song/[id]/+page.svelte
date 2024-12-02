<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let verses = [];
  let title = "";
  let number = "";

  function parseVerses(content) {
    const rawVerses = content.split("\n\r\n");
    console.log(rawVerses);
    return rawVerses.map((verse) =>
      verse
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
    ).filter((verse) => verse.length > 0);
  }

  onMount(async () => {
    const songId = $page.params.id;
    const response = await fetch(`/api/songs/${songId}`);
    const data = await response.json();
    console.log(data);
    verses = parseVerses(data.content);
    console.log(verses);
    title = data.title;
    number = songId.split(".")[0];
  });

  export let data;

  // Função para identificar se é refrão (não começa com número)
  const isChorus = (verse) => !/^\d/.test(verse.trim());
</script>

<main class="container mx-auto p-4 max-w-3xl">
  <div class="mb-8">
    <a href="/" class="flex items-center gap-2 hover:text-gray-600 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left -rotate-90">
        <path d="M12 19V5"/>
        <path d="M5 12l7-7 7 7"/>
      </svg>
      Voltar
    </a>
  </div>
  <div class="song-header mb-8">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-2xl font-semibold text-gray-600">#{number}</span>
      <h1 class="text-3xl font-bold text-gray-800">{title}</h1>
    </div>
  </div>

  <div class="song-content">
    {#each verses as verse}
      <div class="verse-container {isChorus(verse[0]) ? 'chorus' : ''}">
        {#each verse as line}
          <p class="verse-line">{line}</p>
        {/each}
      </div>
    {/each}
  </div>
</main>

<style>
  .song-content {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #374151;
  }

  .verse-container {
    margin-bottom: 2rem;
  }

  .verse-line {
    margin-bottom: 0.25rem;
  }

  .chorus {
    padding-left: 2rem;
    font-style: italic;
    color: #4b5563;
  }
</style>

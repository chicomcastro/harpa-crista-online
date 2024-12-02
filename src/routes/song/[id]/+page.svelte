<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let content = '';
  let title = '';
  
  onMount(async () => {
    const songId = $page.params.id;
    const response = await fetch(`/api/songs/${songId}`);
    const data = await response.json();
    content = data.content;
    title = data.title;
  });
</script>

<main class="container mx-auto p-4">
  <a href="/" class="text-blue-600 hover:underline mb-4 inline-block">← Voltar</a>
  
  <h1 class="text-3xl font-bold mb-6">{title}</h1>
  
  <div class="prose max-w-none">
    {#each content.split('\n') as line}
      <p class="mb-2">{line}</p>
    {/each}
  </div>
</main> 
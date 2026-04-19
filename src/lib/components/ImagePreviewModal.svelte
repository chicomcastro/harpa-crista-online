<script>
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { verseToImage, VERSE_TEMPLATES, VERSE_FORMATS, shareOrDownloadCanvas } from '$lib/utils.js';
  import { track } from '$lib/analytics.js';

  /** @type {{ open: boolean, title: string, number: number, lines: string[], filename: string, shareTitle: string, eventName?: string, onClose: () => void, onShared?: (method: string) => void }} */
  let { open, title, number, lines, filename, shareTitle, eventName = 'image_shared', onClose, onShared } = $props();

  let template = $state('cream');
  let format = $state('story');
  let previewDataUrl = $state('');
  let sharing = $state(false);
  let dragY = $state(0);
  let dragging = $state(false);
  let dragStart = 0;

  function onDragStart(e) {
    dragStart = e.touches[0].clientY;
    dragging = true;
  }
  function onDragMove(e) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - dragStart;
    dragY = Math.max(0, dy);
  }
  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    if (dragY > 120) { dragY = 0; onClose(); }
    else dragY = 0;
  }

  $effect(() => {
    if (!open) return;
    const canvas = verseToImage({ title, number, lines }, template, format);
    previewDataUrl = canvas.toDataURL('image/png');
  });

  $effect(() => {
    if (open) { template = 'cream'; format = 'story'; }
  });

  async function confirm() {
    if (sharing) return;
    sharing = true;
    try {
      const canvas = verseToImage({ title, number, lines }, template, format);
      const result = await shareOrDownloadCanvas(canvas, filename, shareTitle);
      track(eventName, { number, method: result.method, template, format });
      onShared?.(result.method);
      onClose();
    } catch (err) {
      console.error('Erro ao compartilhar imagem:', err);
    } finally {
      sharing = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
    transition:fade={{ duration: 180 }}
    onclick={onClose}
    role="presentation"
  ></div>
  <div
    class="fixed inset-x-0 bottom-0 sm:inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
  >
    <div
      class="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl pt-2 px-4 pb-4 max-h-[95vh] overflow-y-auto pointer-events-auto shadow-2xl"
      style="transform: translateY({dragY}px); transition: {dragging ? 'none' : 'transform 0.2s ease-out'};"
      transition:fly={{ y: 600, duration: 320, easing: cubicOut, opacity: 1 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        class="sm:hidden -mx-4 -mt-2 px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        ontouchstart={onDragStart}
        ontouchmove={onDragMove}
        ontouchend={onDragEnd}
        ontouchcancel={onDragEnd}
        role="presentation"
      >
        <div class="mx-auto w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
      </div>

      <div class="flex items-start justify-between mb-4 gap-3">
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-snug flex-1">
          Escolha um estilo e compartilhe essa mensagem
        </p>
        <button onclick={onClose} class="btn-icon shrink-0 -m-1" aria-label="Fechar">
          <span class="mi mi-sm">close</span>
        </button>
      </div>

      <!-- Format toggle -->
      <div class="flex gap-1 mb-2 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
        {#each VERSE_FORMATS as f}
          <button
            onclick={() => format = f.id}
            class="flex-1 py-1.5 text-xs rounded-md transition-colors {format === f.id ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400'}"
          >{f.name}</button>
        {/each}
      </div>

      <!-- Template picker -->
      <div class="flex gap-2 mb-3 overflow-x-auto -mx-1 px-1 pb-1">
        {#each VERSE_TEMPLATES as t}
          <button
            onclick={() => template = t.id}
            class="shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors {template === t.id ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-brand-300'}"
          >{t.name}</button>
        {/each}
      </div>

      <div class="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 mx-auto {format === 'square' ? 'aspect-square max-w-[70%]' : 'aspect-[9/16] max-w-[60%]'}">
        {#if previewDataUrl}
          <img src={previewDataUrl} alt="Preview da imagem" class="w-full h-full object-contain" />
        {/if}
      </div>

      <div class="flex gap-2">
        <button
          onclick={onClose}
          class="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-medium"
        >Cancelar</button>
        <button
          onclick={confirm}
          disabled={sharing}
          class="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center justify-center gap-1.5 disabled:opacity-70"
        >
          <span class="mi mi-sm">share</span>
          {sharing ? 'Enviando…' : 'Compartilhar'}
        </button>
      </div>
    </div>
  </div>
{/if}

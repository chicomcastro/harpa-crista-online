<script>
  // O +layout.svelte recebe um snippet `children`; não dá para montá-lo direto do teste.
  import Layout from '../routes/+layout.svelte';
</script>

<Layout>
  {#snippet children()}
    <p>conteúdo da página</p>
  {/snippet}
</Layout>

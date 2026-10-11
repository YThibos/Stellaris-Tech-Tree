<script lang="ts">
  import { onMount } from 'svelte';
  import TechTreePage from './components/TechTreePage.svelte';
  import { loadNewestSnapshot, type LoadedSnapshot } from './state/snapshot-loader.ts';

  let snapshot = $state<LoadedSnapshot | null>(null);
  let failure = $state<string | null>(null);

  onMount(async () => {
    try {
      snapshot = await loadNewestSnapshot();
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
  });
</script>

{#if snapshot}
  <TechTreePage {snapshot} />
{:else}
  <main class="status">
    {#if failure}
      <p>The tech data could not be loaded: {failure}</p>
    {:else}
      <p>Charting the tech tree…</p>
    {/if}
  </main>
{/if}

<style>
  .status {
    display: grid;
    place-items: center;
    height: 100%;
    color: var(--text-muted);
    font-size: 1.1rem;
  }
</style>

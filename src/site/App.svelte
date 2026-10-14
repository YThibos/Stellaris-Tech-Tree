<script lang="ts">
  import { onMount } from 'svelte';
  import type { VersionEntry } from '../domain/snapshot.ts';
  import TechTreePage from './components/TechTreePage.svelte';
  import { loadCatalogue, loadSnapshot, type LoadedSnapshot } from './state/snapshot-loader.ts';
  import { readSharedView } from './state/view-address.ts';

  let versions = $state<VersionEntry[]>([]);
  let snapshot = $state<LoadedSnapshot | null>(null);
  let failure = $state<string | null>(null);

  onMount(async () => {
    await attempt(async () => {
      versions = await loadCatalogue();
      const wanted = readSharedView().version;
      await chooseVersion(
        versions.find(({ gameVersion }) => gameVersion === wanted) ?? versions[0],
      );
    });
  });

  async function chooseVersion(version: VersionEntry | undefined): Promise<void> {
    if (!version) return;
    snapshot = null;
    await attempt(async () => {
      snapshot = await loadSnapshot(version);
    });
  }

  async function attempt(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
  }
</script>

{#if snapshot}
  {#key snapshot}
    <TechTreePage {snapshot} {versions} onchooseversion={chooseVersion} />
  {/key}
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

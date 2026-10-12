<script lang="ts">
  import { untrack } from 'svelte';
  import { layoutBoard } from '../state/board-layout.ts';
  import type { LoadedSnapshot } from '../state/snapshot-loader.ts';
  import { CampaignBook } from '../state/campaign-book.svelte.ts';
  import { SaveImport } from '../state/save-import-status.svelte.ts';
  import { TreeView } from '../state/tree-view.svelte.ts';
  import { readSharedView, writeSharedView } from '../state/view-address.ts';
  import Board from './Board.svelte';
  import TechDetails from './TechDetails.svelte';
  import type { TopBarPanel } from '../state/top-bar-panel.ts';
  import TopBar from './TopBar.svelte';

  let { snapshot }: { snapshot: LoadedSnapshot } = $props();

  const view = untrack(() => restoredView(snapshot));
  const layout = $derived(layoutBoard(view.tree));
  let search = $state<HTMLInputElement | null>(null);
  let openPanel = $state<TopBarPanel | null>(null);
  const saveImport = untrack(
    () => new SaveImport(view.campaigns, (key) => view.tree.technology(key) !== undefined),
  );

  $effect(() => {
    writeSharedView({ query: view.query, lit: [...view.lit], modsOff: view.modsOff() });
  });

  function restoredView({ layers }: LoadedSnapshot): TreeView {
    const shared = readSharedView();
    const restored = new TreeView(layers, shared.modsOff, new CampaignBook());
    restored.query = shared.query;
    for (const key of shared.lit) if (restored.tree.technology(key)) restored.lit.add(key);
    return restored;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === '/' && document.activeElement !== search) {
      event.preventDefault();
      search?.focus();
    } else if (event.key === 'Escape') {
      clearInOrder();
    }
  }

  /** A save dropped anywhere on the page is imported as a campaign. */
  function onDrop(event: DragEvent): void {
    const file = [...(event.dataTransfer?.files ?? [])].find((each) => each.name.endsWith('.sav'));
    if (!file) return;
    event.preventDefault();
    openPanel = 'campaigns';
    void saveImport.start(file);
  }

  /** Escape first clears the search, then the details, then the lit techs. */
  function clearInOrder(): void {
    if (view.query) view.query = '';
    else if (view.inspected) view.inspected = null;
    else view.clearLit();
  }
</script>

<svelte:window
  onkeydown={onKeydown}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
/>

<div class="page">
  <TopBar {view} manifest={snapshot.manifest} {saveImport} bind:search bind:openPanel />
  <div class="workspace">
    <Board {view} {layout} assetBase={snapshot.assetBase} />
    {#if view.inspected}
      <TechDetails {view} assetBase={snapshot.assetBase} />
    {/if}
  </div>
</div>

<style>
  .page {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100%;
  }

  .workspace {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    min-height: 0;
  }
</style>

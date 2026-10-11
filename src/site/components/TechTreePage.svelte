<script lang="ts">
  import { untrack } from 'svelte';
  import { layoutBoard } from '../state/board-layout.ts';
  import type { LoadedSnapshot } from '../state/snapshot-loader.ts';
  import { TreeView } from '../state/tree-view.svelte.ts';
  import { readSharedView, writeSharedView } from '../state/view-address.ts';
  import Board from './Board.svelte';
  import TechDetails from './TechDetails.svelte';
  import TopBar from './TopBar.svelte';

  let { snapshot }: { snapshot: LoadedSnapshot } = $props();

  const view = untrack(() => restoredView(snapshot));
  const layout = untrack(() => layoutBoard(snapshot.tree));
  let search = $state<HTMLInputElement | null>(null);

  $effect(() => {
    writeSharedView({ query: view.query, lit: [...view.lit] });
  });

  function restoredView({ tree }: LoadedSnapshot): TreeView {
    const restored = new TreeView(tree);
    const shared = readSharedView();
    restored.query = shared.query;
    for (const key of shared.lit) if (tree.technology(key)) restored.lit.add(key);
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

  /** Escape first clears the search, then the details, then the lit techs. */
  function clearInOrder(): void {
    if (view.query) view.query = '';
    else if (view.inspected) view.inspected = null;
    else view.clearLit();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="page">
  <TopBar {view} manifest={snapshot.manifest} bind:search />
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

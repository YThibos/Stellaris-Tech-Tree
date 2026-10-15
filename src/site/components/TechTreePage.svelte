<script lang="ts">
  import { untrack } from 'svelte';
  import { layoutBoard } from '../state/board-layout.ts';
  import type { VersionEntry } from '../../domain/snapshot.ts';
  import type { LoadedSnapshot } from '../state/snapshot-loader.ts';
  import { CampaignBook } from '../state/campaign-book.svelte.ts';
  import { SaveImport } from '../state/save-import-status.svelte.ts';
  import { TreeView } from '../state/tree-view.svelte.ts';
  import { readSharedView, writeSharedView } from '../state/view-address.ts';
  import { initialModChoice, readStoredModChoice, storeModChoice } from '../state/mod-choice.ts';
  import Board from './Board.svelte';
  import DetailsDrawer from './DetailsDrawer.svelte';
  import type { TopBarPanel } from '../state/top-bar-panel.ts';
  import { columnForKey, panFor } from '../state/shortkeys.ts';
  import TopBar from './TopBar.svelte';

  let {
    snapshot,
    versions,
    onchooseversion,
  }: {
    snapshot: LoadedSnapshot;
    versions: VersionEntry[];
    onchooseversion: (version: VersionEntry) => void;
  } = $props();

  const isNewest = $derived(versions[0]?.gameVersion === snapshot.version.gameVersion);

  const view = untrack(() => restoredView(snapshot));
  const layout = $derived(layoutBoard(view.tree));
  let search = $state<HTMLInputElement | null>(null);
  let openPanel = $state<TopBarPanel | null>(null);
  const saveImport = untrack(
    () =>
      new SaveImport(
        view.campaigns,
        (key) => view.tree.technology(key) !== undefined,
        (keys) => view.switchOnModsDefining(keys),
      ),
  );

  $effect(() => {
    writeSharedView({
      version: isNewest ? null : snapshot.version.gameVersion,
      query: view.query,
      lit: [...view.lit],
      modsOn: view.modsOn(),
    });
  });

  $effect(() => {
    if (isNewest) storeModChoice(view.modsOn());
  });

  function restoredView({ layers }: LoadedSnapshot): TreeView {
    const shared = readSharedView();
    const available = layers.slice(1).map(({ source }) => source.id);
    const modsOn = initialModChoice(shared, available, readStoredModChoice());
    const restored = new TreeView(layers, modsOn, new CampaignBook());
    restored.query = shared.query;
    for (const key of shared.lit) if (restored.tree.technology(key)) restored.lit.add(key);
    return restored;
  }

  const TEXT_ENTRY =
    'input:not([type="checkbox"], [type="radio"], [type="file"]), textarea, select, [contenteditable="true"]';

  /** Keys modelled on Stellaris; letters only act while the player is not typing in a box. */
  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') return clearInOrder();
    if (isTyping(event) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (handleShortkey(event)) event.preventDefault();
  }

  function handleShortkey(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    if (key === 'f' || key === '/') search?.focus();
    else if (key === 'q') view.goToSelection();
    else if (event.key === 'Backspace') view.goBack();
    else if (event.key === 'Home') view.goHome();
    else return jumpToColumn(event) || pan(event);
    return true;
  }

  function jumpToColumn(event: KeyboardEvent): boolean {
    const column = columnForKey(event.key, event.code);
    if (column) view.goToColumn(column);
    return column !== undefined;
  }

  function pan(event: KeyboardEvent): boolean {
    const movement = panFor(event.key, event.shiftKey);
    if (movement) view.pan(...movement);
    return movement !== undefined;
  }

  /** Typing in a text box or list must never trigger a shortcut; ticking a checkbox may. */
  function isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest(TEXT_ENTRY));
  }

  /** A save dropped anywhere on the page is imported as a campaign. */
  function onDrop(event: DragEvent): void {
    const file = [...(event.dataTransfer?.files ?? [])].find((each) => each.name.endsWith('.sav'));
    if (!file) return;
    event.preventDefault();
    openPanel = 'campaigns';
    void saveImport.start(file);
  }

  /**
   * Escape closes the open panel first, as in game, then clears the search, folds the details away,
   * clears the selection and switches off the lit techs.
   */
  function clearInOrder(): void {
    if (openPanel) openPanel = null;
    else if (view.query) view.query = '';
    else if (view.detailsOpen) view.foldDetails();
    else if (view.selected) view.clearSelection();
    else view.clearLit();
  }
</script>

<svelte:window
  onkeydown={onKeydown}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
/>

<div class="page">
  <TopBar
    {view}
    manifest={snapshot.manifest}
    assetBase={snapshot.assetBase}
    {versions}
    {onchooseversion}
    {saveImport}
    bind:search
    bind:openPanel
  />
  <div class="workspace">
    <Board {view} {layout} assetBase={snapshot.assetBase} />
    <DetailsDrawer {view} assetBase={snapshot.assetBase} />
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

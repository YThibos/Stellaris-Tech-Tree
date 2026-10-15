<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Action } from 'svelte/action';
  import { SvelteMap } from 'svelte/reactivity';
  import type { ResearchArea } from '../../domain/research-area.ts';
  import type { Technology } from '../../domain/technology.ts';
  import {
    subColumnsFor,
    type BoardLayout,
    type Cell,
    type CategoryGroup,
  } from '../state/board-layout.ts';
  import { areaTitle, columnBadge, columnTitle } from '../state/presentation.ts';
  import type { BoardCommand, TreeView } from '../state/tree-view.svelte.ts';
  import LinkLayer from './LinkLayer.svelte';
  import TechCard from './TechCard.svelte';
  import TierGateNote from './TierGateNote.svelte';

  let { view, layout, assetBase }: { view: TreeView; layout: BoardLayout; assetBase: string } =
    $props();

  const areaIcons: Record<ResearchArea, string> = {
    physics: new URL('../assets/physics.webp', import.meta.url).href,
    society: new URL('../assets/society.webp', import.meta.url).href,
    engineering: new URL('../assets/engineering.webp', import.meta.url).href,
  };

  const cards = new SvelteMap<string, HTMLElement>();
  const columnHeaders = new Map<string, HTMLElement>();
  let board = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);

  const LOCATED_MARK_MS = 1600;

  /**
   * A new search starts from the top-left; clearing the search returns to the selected tech, so
   * the player does not lose the place they searched for.
   */
  $effect(() => {
    const searching = view.isSearching();
    const selected = untrack(() => view.selected);
    if (!searching && selected) view.goTo(selected);
    else board?.scrollTo({ left: 0, top: 0 });
  });

  $effect(() => {
    const request = view.boardCommand;
    if (request) untrack(() => void tick().then(() => carryOut(request.command)));
  });

  function carryOut(command: BoardCommand): void {
    if (command.kind === 'home') board?.scrollTo({ left: 0, top: 0, behavior: scrollBehaviour() });
    if (command.kind === 'pan')
      board?.scrollBy({ left: command.right, top: command.down, behavior: scrollBehaviour() });
    if (command.kind === 'locate') locate(command.key);
    if (command.kind === 'column') showColumn(command.columnId);
  }

  /** Scrolls a column to the left edge, just right of the research area labels. */
  function showColumn(id: string): void {
    const header = columnHeaders.get(id);
    if (!board || !header || header.hidden) return;
    const labelWidth = parseFloat(getComputedStyle(board).getPropertyValue('--band-label-width'));
    board.scrollTo({ left: header.offsetLeft - labelWidth, behavior: scrollBehaviour() });
  }

  function locate(key: string): void {
    const card = cards.get(key);
    if (!card || card.hidden) return;
    card.scrollIntoView({ block: 'center', inline: 'center', behavior: scrollBehaviour() });
    view.located = key;
    setTimeout(() => {
      if (view.located === key) view.located = null;
    }, LOCATED_MARK_MS);
  }

  /** A click on the empty board, away from any card or control, folds the details away. */
  function onBoardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.card, button, a, input, select, label')) view.foldDetails();
  }

  function scrollBehaviour(): 'smooth' | 'auto' {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  const visibleColumnIds = $derived(
    new Set(
      layout.columns
        .filter((column) =>
          layout.bands.some((band) => cellHasVisible(cellIn(band.cells, column.id))),
        )
        .map((column) => column.id),
    ),
  );

  const subColumns = $derived(
    new Map(
      layout.columns.map((column) => [
        column.id,
        subColumnsFor(
          Math.max(...layout.bands.map((band) => visibleIn(cellIn(band.cells, column.id)))),
        ),
      ]),
    ),
  );

  const registerCard: Action<HTMLElement, string> = (element, key) => {
    cards.set(key, element);
    return { destroy: () => cards.delete(key) };
  };

  const registerColumn: Action<HTMLElement, string> = (element, id) => {
    columnHeaders.set(id, element);
    return { destroy: () => columnHeaders.delete(id) };
  };

  function cellIn(cells: Cell[], columnId: string): Cell | undefined {
    return cells.find((cell) => cell.columnId === columnId);
  }

  function visibleIn(cell: Cell | undefined): number {
    return cell?.groups.flatMap((group) => group.technologies.filter(isVisible)).length ?? 0;
  }

  function cellHasVisible(cell: Cell | undefined): boolean {
    return cell?.groups.some(groupHasVisible) ?? false;
  }

  function groupHasVisible(group: CategoryGroup): boolean {
    return group.technologies.some(isVisible);
  }

  function isVisible(technology: Technology): boolean {
    return view.visible.has(technology.key);
  }
</script>

<!-- Folding on a background click is a mouse convenience; Esc does the same from the keyboard. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="board" aria-label="Technology tree" bind:this={board} onclick={onBoardClick}>
  <div
    class="content"
    bind:this={content}
    style:grid-template-columns="var(--band-label-width) {layout.columns
      .filter((column) => visibleColumnIds.has(column.id))
      .map(() => 'auto')
      .join(' ')}"
  >
    <div class="corner"></div>
    {#each layout.columns as column (column.id)}
      <div
        class="column-header"
        hidden={!visibleColumnIds.has(column.id)}
        use:registerColumn={column.id}
      >
        <span class="badge" class:repeatable={column.column.kind === 'repeatable'}>
          {columnBadge(column.column)}
        </span>
        <span class="title">{columnTitle(column.column)}</span>
        {#if column.column.kind === 'tier'}
          <TierGateNote gate={view.tree.tierGate(column.column.tier)} {view} />
        {/if}
      </div>
    {/each}

    {#each layout.bands as band (band.area)}
      {@const bandVisible = band.cells.some(cellHasVisible)}
      <div class="band-label {band.area}" hidden={!bandVisible}>
        <div class="band-title">
          <img src={areaIcons[band.area]} alt="" width="18" height="18" />
          <span>{areaTitle(band.area)}</span>
        </div>
      </div>
      {#each layout.columns as column (column.id)}
        {@const cell = cellIn(band.cells, column.id)}
        <div
          class="cell {band.area}"
          hidden={!bandVisible || !visibleColumnIds.has(column.id)}
          style:grid-template-columns="repeat({subColumns.get(column.id)}, var(--card-width))"
        >
          {#each cell?.groups ?? [] as group (group.category)}
            <div class="category" hidden={!groupHasVisible(group)}>{group.category}</div>
            {#each group.technologies as technology (technology.key)}
              <TechCard {technology} {view} {assetBase} register={registerCard} />
            {/each}
          {/each}
        </div>
      {/each}
    {/each}

    <LinkLayer {view} {cards} {content} />
  </div>
</div>

<style>
  .board {
    --card-width: 200px;
    --band-label-width: 40px;
    overflow: auto;
    min-height: 0;
  }

  .content {
    position: relative;
    display: grid;
    width: max-content;
    min-width: 100%;
  }

  .corner,
  .column-header {
    position: sticky;
    top: 0;
    z-index: 6;
    background: #0b131dee;
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }

  .corner {
    left: 0;
    z-index: 7;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
    border-left: 1px solid var(--line);
  }

  .badge {
    padding: 0.1rem 0.45rem;
    border: 1px solid #ffffff33;
    border-radius: 4px;
    background: #ffffff10;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
  }

  .badge.repeatable {
    color: var(--hover);
    border-color: #7fe3ff66;
  }

  .title {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .band-label {
    position: sticky;
    left: 0;
    z-index: 5;
    min-height: 9.5rem;
    padding: 0.8rem 0;
    background: #0b131df2;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    border-left: 3px solid var(--area);
  }

  .band-title {
    position: sticky;
    top: 3.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .band-label span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--area);
  }

  .physics {
    --area: var(--physics);
  }

  .society {
    --area: var(--society);
  }

  .engineering {
    --area: var(--engineering);
  }

  .cell {
    display: grid;
    align-content: start;
    gap: 0.4rem 0.5rem;
    padding: 0.7rem 0.8rem 1rem;
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--area) 3%, transparent);
  }

  .category {
    position: relative;
    z-index: 2;
    grid-column: 1 / -1;
    margin-top: 0.3rem;
    color: var(--text-faint);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>

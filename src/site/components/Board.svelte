<script lang="ts">
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
  import type { TreeView } from '../state/tree-view.svelte.ts';
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
  let board = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);

  $effect(() => {
    void view.query;
    board?.scrollTo({ left: 0, top: 0 });
  });

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

<div class="board" aria-label="Technology tree" bind:this={board}>
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
      <div class="column-header" hidden={!visibleColumnIds.has(column.id)}>
        <span class="badge" class:repeatable={column.column.kind === 'repeatable'}>
          {columnBadge(column.column)}
        </span>
        <span class="title">{columnTitle(column.column)}</span>
        {#if column.column.kind === 'tier'}
          <TierGateNote gate={view.tree.tierGate(column.column.tier)} />
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

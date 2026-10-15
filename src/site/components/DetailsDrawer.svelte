<script lang="ts">
  import type { TreeView } from '../state/tree-view.svelte.ts';
  import TechDetails from './TechDetails.svelte';

  let { view, assetBase }: { view: TreeView; assetBase: string } = $props();

  const technology = $derived(view.selected ? view.tree.technology(view.selected) : undefined);
  const open = $derived(view.detailsOpen && technology !== undefined);
</script>

<div class="drawer {technology?.area ?? 'nothing-selected'}" class:open>
  <button
    class="edge"
    onclick={() => view.toggleDetails()}
    disabled={!technology}
    aria-expanded={open}
    aria-controls="tech-details"
    title={technology
      ? `${open ? 'Fold away' : 'Show'} the details of ${technology.name}`
      : "No tech selected; click a card's ⓘ to select one"}
  >
    <span class="chevron" aria-hidden="true">{open ? '›' : '‹'}</span>
    <span class="name">{technology?.name ?? 'No tech selected'}</span>
  </button>
  <div class="slot" id="tech-details" inert={!open}>
    {#if technology}
      <TechDetails {view} {technology} {assetBase} />
    {/if}
  </div>
</div>

<style>
  .drawer {
    --area: var(--engineering);
    --edge-width: 26px;
    position: relative;
    z-index: 10;
    display: flex;
    min-height: 0;
  }

  .physics {
    --area: var(--physics);
  }

  .society {
    --area: var(--society);
  }

  .nothing-selected {
    --area: var(--nothing-selected);
  }

  .open {
    box-shadow: -12px 0 30px #0008;
  }

  .edge {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    width: var(--edge-width);
    padding: 0.6rem 0;
    border: none;
    border-left: 3px solid var(--area);
    background: color-mix(in srgb, var(--area) 14%, var(--panel));
    color: var(--area);
    cursor: pointer;
  }

  .edge:hover:not(:disabled) {
    background: color-mix(in srgb, var(--area) 26%, var(--panel));
  }

  .edge:disabled {
    background: var(--panel);
    cursor: default;
  }

  .chevron {
    font-size: 1.1rem;
    line-height: 1;
  }

  .name {
    overflow: hidden;
    max-height: calc(100% - 2rem);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-overflow: ellipsis;
    white-space: nowrap;
    writing-mode: vertical-rl;
  }

  .open .name {
    visibility: hidden;
  }

  /*
   * The board makes room at once, so a tech centred as the details open is not hidden behind them;
   * the details slide over that room, and on folding the room is given back once they are out.
   */
  .slot {
    width: 0;
    overflow: hidden;
    transition: width 0s 220ms;
  }

  .open .slot {
    width: min(400px, calc(100vw - var(--edge-width)));
    transition: none;
  }

  .slot > :global(*) {
    transform: translateX(100%);
    transition: transform 220ms ease;
  }

  .open .slot > :global(*) {
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .slot,
    .slot > :global(*) {
      transition: none;
    }
  }

  @media (max-width: 720px) {
    .drawer {
      position: absolute;
      inset: 0 0 0 auto;
    }
  }
</style>

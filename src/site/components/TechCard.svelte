<script lang="ts">
  import type { Action } from 'svelte/action';
  import { hasTrait, isRepeatable, type Technology } from '../../domain/technology.ts';
  import {
    badgedTraitsOf,
    iconUrl,
    researchCost,
    traitGlyph,
    traitTitle,
  } from '../state/presentation.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let {
    technology,
    view,
    assetBase,
    register,
  }: {
    technology: Technology;
    view: TreeView;
    assetBase: string;
    register: Action<HTMLElement, string>;
  } = $props();

  const emphasis = $derived(view.emphasisOf(technology.key));
  const requirementCount = $derived(
    technology.prerequisites.length + technology.requiresOneOf.length,
  );
  const dimmed = $derived(view.isFaded(technology.key));

  function onLeave(): void {
    if (view.hovered === technology.key) view.hovered = null;
  }
</script>

<div
  class="card {technology.area} emphasis-{emphasis}"
  class:dimmed
  class:rare={hasTrait(technology, 'rare')}
  class:dangerous={hasTrait(technology, 'dangerous')}
  class:inspected={view.inspected === technology.key}
  hidden={!view.visible.has(technology.key)}
  use:register={technology.key}
>
  <button
    class="body"
    onclick={() => view.toggleLit(technology.key)}
    onmouseenter={() => (view.hovered = technology.key)}
    onmouseleave={onLeave}
    aria-pressed={view.lit.has(technology.key)}
    title={technology.name}
  >
    {#if technology.icon}
      <img src={iconUrl(assetBase, technology.icon)} alt="" width="36" height="36" loading="lazy" />
    {:else}
      <span class="no-icon"></span>
    {/if}
    <span class="text">
      <span class="name">{technology.name}</span>
      <span class="meta">
        <span class="cost">{researchCost(technology.cost)}</span>
        {#if isRepeatable(technology)}<span class="repeatable" title="Repeatable">∞</span>{/if}
        {#each badgedTraitsOf(technology.traits) as trait (trait)}
          <span class="trait {trait}" title={traitTitle(trait)}>{traitGlyph(trait)}</span>
        {/each}
        {#if requirementCount > 1}
          <span class="multi" title="{requirementCount} requirements">⇇{requirementCount}</span>
        {/if}
      </span>
    </span>
  </button>
  <button
    class="info"
    onclick={() => (view.inspected = technology.key)}
    aria-label="Details of {technology.name}"
    title="Details">ⓘ</button
  >
</div>

<style>
  .card {
    --area: var(--engineering);
    position: relative;
    z-index: 2;
    display: flex;
    width: var(--card-width);
    height: 48px;
    border: 1px solid var(--line);
    border-left: 3px solid var(--area);
    border-radius: var(--radius);
    background: var(--card);
    transition:
      opacity 120ms,
      box-shadow 120ms,
      border-color 120ms;
  }

  .card.physics {
    --area: var(--physics);
  }

  .card.society {
    --area: var(--society);
  }

  .card:hover {
    background: var(--card-hover);
  }

  .card.rare {
    border-top-color: var(--rare);
    border-right-color: var(--rare);
    border-bottom-color: var(--rare);
    background: var(--rare-card);
  }

  .card.dangerous {
    border-top-color: var(--dangerous);
    border-right-color: var(--dangerous);
    border-bottom-color: var(--dangerous);
    background: var(--dangerous-card);
  }

  .card.rare:hover,
  .card.dangerous:hover {
    filter: brightness(1.2);
  }

  .card.dimmed {
    opacity: 0.32;
  }

  .card.emphasis-hovered {
    border-color: var(--hover);
    box-shadow:
      0 0 0 1px var(--hover),
      0 0 14px #7fe3ff55;
  }

  .card.emphasis-lit {
    border-color: var(--lit);
    background: #2a2512;
    box-shadow:
      0 0 0 1px var(--lit),
      0 0 18px #ffd16677;
  }

  .card.emphasis-on-lit-path {
    border-color: #ffd166aa;
    box-shadow: 0 0 10px #ffd16633;
  }

  .card.emphasis-on-hover-path {
    border-color: #7fe3ffaa;
  }

  .card.emphasis-leads-to {
    border-color: var(--leads-to);
  }

  .card.inspected {
    outline: 1px dashed var(--text-muted);
    outline-offset: 2px;
  }

  .body {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex: 1;
    min-width: 0;
    padding: 0 0.15rem 0 0.35rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  img,
  .no-icon {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 4px;
  }

  .no-icon {
    background: var(--panel-raised);
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.15;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .meta {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  .repeatable {
    color: var(--hover);
    font-weight: 700;
  }

  .trait.starting {
    color: var(--lit);
  }

  .trait.granted {
    color: var(--hover);
  }

  .multi {
    color: var(--warning);
  }

  .info {
    flex: none;
    width: 22px;
    border: none;
    border-left: 1px solid var(--line);
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .info:hover {
    color: var(--text);
  }
</style>

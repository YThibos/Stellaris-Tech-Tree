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
  const changedBy = $derived(
    view.replacedDefinitionOf(technology.key) ? view.sourceOf(technology)?.name : undefined,
  );
  const missing = $derived(view.tree.missingRequirements(technology));
  const mods = $derived(view.modsInvolvedIn(technology));
  const level = $derived(view.researchedLevel(technology.key));
</script>

<div
  class="card {technology.area} emphasis-{emphasis}"
  class:dimmed
  class:rare={hasTrait(technology, 'rare')}
  class:dangerous={hasTrait(technology, 'dangerous')}
  class:selected={view.selected === technology.key}
  class:researched={level > 0}
  class:located={view.located === technology.key}
  hidden={!view.visible.has(technology.key)}
  use:register={technology.key}
>
  <button
    class="body"
    onclick={() => view.toggleLitAndSelect(technology.key)}
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
        {#if level > 1}<span class="level" title="Researched {level} times">Lv {level}</span>{/if}
        {#if isRepeatable(technology)}<span class="repeatable" title="Repeatable">∞</span>{/if}
        {#each badgedTraitsOf(technology.traits) as trait (trait)}
          <span class="trait {trait}" title={traitTitle(trait)}>{traitGlyph(trait)}</span>
        {/each}
        {#if mods.length > 0}
          <span class="mod" title="From mods: {mods.map(({ name }) => name).join(', ')}">MOD</span>
        {/if}
        {#if changedBy}
          <span class="changed" title="Changed by {changedBy}">✎</span>
        {/if}
        {#if missing.length > 0}
          <span class="missing" title="Needs techs that are not loaded: {missing.join(', ')}"
            >!</span
          >
        {/if}
        {#if requirementCount > 1}
          <span class="multi" title="{requirementCount} requirements">⇇{requirementCount}</span>
        {/if}
      </span>
    </span>
  </button>
  <div class="side">
    <button
      class="info"
      onclick={() => view.openDetails(technology.key)}
      aria-label="Details of {technology.name}"
      title="Details">ⓘ</button
    >
    {#if view.campaigns.active}
      <button
        class="research"
        onclick={() => view.toggleResearched(technology.key)}
        aria-pressed={level > 0}
        aria-label="{level > 0 ? 'Unmark' : 'Mark'} {technology.name} researched"
        title={level > 0
          ? 'Researched - click to unmark it and everything that needs it'
          : 'Mark researched, with everything it requires'}>✓</button
      >
    {/if}
  </div>
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

  .card.emphasis-leads-to {
    border-color: var(--leads-to);
    box-shadow: 0 0 10px #c49bff44;
  }

  .card.located {
    animation: locate 0.8s ease-out 2;
  }

  @keyframes locate {
    from {
      box-shadow:
        0 0 0 3px var(--hover),
        0 0 24px var(--hover);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card.located {
      animation: none;
      box-shadow: 0 0 0 3px var(--hover);
    }
  }

  .card.selected {
    z-index: 3;
    background: color-mix(in srgb, var(--area) 18%, var(--card));
    outline: 2px solid var(--selected);
    outline-offset: 2px;
    filter: drop-shadow(0 0 8px var(--area));
  }

  .card.selected .name {
    color: #ffffff;
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

  .mod {
    padding: 0 0.25rem;
    border: 1px solid #4ea5ff88;
    border-radius: 3px;
    color: var(--physics);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1.3;
  }

  .changed {
    color: var(--leads-to);
  }

  .missing {
    color: var(--penalty);
    font-weight: 700;
  }

  .multi {
    color: var(--warning);
  }

  .side {
    display: flex;
    flex: none;
    flex-direction: column;
    width: 22px;
    border-left: 1px solid var(--line);
  }

  .side button {
    flex: 1;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    font-size: 0.8rem;
  }

  .side button:hover {
    color: var(--text);
  }

  .research {
    border-top: 1px solid var(--line) !important;
  }

  .card.researched {
    opacity: 0.6;
  }

  .card.researched .research {
    background: var(--researched);
    color: #08140c;
    font-weight: 700;
  }

  .card.researched .research:hover {
    color: #08140c;
  }

  .level {
    color: var(--researched);
    font-weight: 700;
  }
</style>

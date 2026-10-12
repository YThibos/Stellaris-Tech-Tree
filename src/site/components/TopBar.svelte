<script lang="ts">
  import type { SnapshotManifest } from '../../domain/snapshot.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';
  import Legend from './Legend.svelte';
  import ModPanel from './ModPanel.svelte';

  let {
    view,
    manifest,
    search = $bindable(),
  }: { view: TreeView; manifest: SnapshotManifest; search: HTMLInputElement | null } = $props();

  let openPanel = $state<'legend' | 'mods' | null>(null);
  const shownCount = $derived(view.visible.size);

  function toggle(panel: 'legend' | 'mods'): void {
    openPanel = openPanel === panel ? null : panel;
  }
  const totalCount = $derived(view.tree.technologies.length);
</script>

<header class="top-bar">
  <div class="brand">
    <h1>Stellaris Tech Tree</h1>
    <span class="version" title={manifest.notice ?? undefined}>
      Stellaris {manifest.gameVersion}{manifest.notice ? ' · preview data' : ''}
    </span>
  </div>

  <label class="search">
    <span class="visually-hidden">Search techs</span>
    <input
      bind:this={search}
      bind:value={view.query}
      type="search"
      placeholder="Search techs, unlocks, categories…   ( / )"
      autocomplete="off"
      spellcheck="false"
    />
    {#if view.query}
      <span class="count">{shownCount} of {totalCount}</span>
    {/if}
  </label>

  <div class="actions">
    {#if view.lit.size > 0}
      <button class="lit-summary" onclick={() => view.clearLit()} title="Clear every lit path">
        <span class="lit-dot"></span>{view.lit.size} lit · Clear
      </button>
    {/if}
    {#if view.mods().length > 0}
      <button onclick={() => toggle('mods')} aria-expanded={openPanel === 'mods'}>
        Mods {view.enabledMods.size}/{view.mods().length}
      </button>
    {/if}
    <button onclick={() => toggle('legend')} aria-expanded={openPanel === 'legend'}>Legend</button>
  </div>
</header>

{#if openPanel === 'legend'}
  <Legend onclose={() => (openPanel = null)} />
{:else if openPanel === 'mods'}
  <ModPanel {view} onclose={() => (openPanel = null)} />
{/if}

<style>
  .top-bar {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.6rem 1rem;
    background: linear-gradient(180deg, #111d2b, #0c1520);
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  h1 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #e9f2fa;
  }

  .version {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .search {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 560px;
  }

  input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--space);
    color: var(--text);
    font: inherit;
  }

  input:focus {
    outline: none;
    border-color: var(--hover);
    box-shadow: 0 0 0 2px #7fe3ff33;
  }

  .count {
    position: absolute;
    right: 2.2rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 0.8rem;
    pointer-events: none;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  button {
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--panel-raised);
    cursor: pointer;
  }

  button:hover {
    border-color: var(--text-faint);
  }

  .lit-summary {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    border-color: #ffd16666;
    color: var(--lit);
  }

  .lit-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lit);
    box-shadow: 0 0 8px var(--lit);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>

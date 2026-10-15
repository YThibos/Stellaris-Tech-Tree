<script lang="ts">
  import type { SnapshotManifest, VersionEntry } from '../../domain/snapshot.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';
  import type { SaveImport } from '../state/save-import-status.svelte.ts';
  import type { TopBarPanel } from '../state/top-bar-panel.ts';
  import CampaignPanel from './CampaignPanel.svelte';
  import CapacitiesPanel from './CapacitiesPanel.svelte';
  import DlcPanel from './DlcPanel.svelte';
  import Legend from './Legend.svelte';
  import ModPanel from './ModPanel.svelte';
  import SearchBox from './SearchBox.svelte';
  import ShortkeysPanel from './ShortkeysPanel.svelte';

  let {
    view,
    manifest,
    assetBase,
    versions,
    onchooseversion,
    saveImport,
    search = $bindable(),
    openPanel = $bindable(),
  }: {
    view: TreeView;
    manifest: SnapshotManifest;
    assetBase: string;
    versions: VersionEntry[];
    onchooseversion: (version: VersionEntry) => void;
    saveImport: SaveImport;
    search: HTMLInputElement | null;
    openPanel: TopBarPanel | null;
  } = $props();

  const campaign = $derived(view.campaigns.active);

  function chooseVersion(gameVersion: string): void {
    const version = versions.find((each) => each.gameVersion === gameVersion);
    if (version) onchooseversion(version);
  }

  function toggle(panel: TopBarPanel): void {
    openPanel = openPanel === panel ? null : panel;
  }
</script>

<header class="top-bar">
  <div class="brand">
    <h1>Stellaris Tech Tree</h1>
    {#if versions.length > 1}
      <label class="version">
        <span>Stellaris</span>
        <select
          id="game-version"
          value={manifest.gameVersion}
          onchange={(event) => chooseVersion(event.currentTarget.value)}
        >
          {#each versions as version, index (version.gameVersion)}
            <option value={version.gameVersion}
              >{version.gameVersion}{index === 0 ? ' (newest)' : ''}</option
            >
          {/each}
        </select>
      </label>
    {:else}
      <span class="version">Stellaris {manifest.gameVersion}</span>
    {/if}
  </div>

  <SearchBox {view} {assetBase} bind:input={search} />

  <div class="actions">
    {#if view.lit.size > 0}
      <button
        class="lit-summary"
        onclick={() => view.clearLitAndSelection()}
        title="Clear every lit path and the selection"
      >
        <span class="lit-dot"></span>{view.lit.size} lit · Clear
      </button>
    {/if}
    {#if campaign}
      <label class="hide-researched">
        <input type="checkbox" bind:checked={view.campaigns.hideResearched} />
        Hide researched
      </label>
    {/if}
    <button onclick={() => toggle('campaigns')} aria-expanded={openPanel === 'campaigns'}>
      {campaign ? campaign.name : 'Campaign'}
    </button>
    <button onclick={() => toggle('capacities')} aria-expanded={openPanel === 'capacities'}>
      Capacities
    </button>
    {#if view.mods().length > 0}
      <button onclick={() => toggle('mods')} aria-expanded={openPanel === 'mods'}>
        Mods {view.enabledMods.size}/{view.mods().length}
      </button>
    {/if}
    {#if view.dlcs.length > 0}
      <button onclick={() => toggle('dlcs')} aria-expanded={openPanel === 'dlcs'}>
        DLCs {view.dlcs.filter((dlc) => !view.dlcsOff.has(dlc)).length}/{view.dlcs.length}
      </button>
    {/if}
    <button onclick={() => toggle('legend')} aria-expanded={openPanel === 'legend'}>Legend</button>
    <button onclick={() => toggle('shortkeys')} aria-expanded={openPanel === 'shortkeys'}>
      Shortkeys
    </button>
  </div>
</header>

{#if openPanel === 'legend'}
  <Legend onclose={() => (openPanel = null)} />
{:else if openPanel === 'mods'}
  <ModPanel {view} onclose={() => (openPanel = null)} />
{:else if openPanel === 'dlcs'}
  <DlcPanel {view} onclose={() => (openPanel = null)} />
{:else if openPanel === 'shortkeys'}
  <ShortkeysPanel onclose={() => (openPanel = null)} />
{:else if openPanel === 'capacities'}
  <CapacitiesPanel {view} onclose={() => (openPanel = null)} />
{:else if openPanel === 'campaigns'}
  <CampaignPanel {view} {saveImport} onclose={() => (openPanel = null)} />
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
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .version select {
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--space);
    color: var(--text);
    font: inherit;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
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

  .hide-researched {
    display: flex;
    white-space: nowrap;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .hide-researched input {
    accent-color: var(--researched);
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
</style>

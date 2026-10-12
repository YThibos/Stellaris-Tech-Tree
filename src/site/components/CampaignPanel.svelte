<script lang="ts">
  import { RESEARCH_AREAS, type ResearchArea } from '../../domain/research-area.ts';
  import { campaignFromFile, campaignToFile } from '../state/campaign-file.ts';
  import { areaTitle } from '../state/presentation.ts';
  import type { SaveImport } from '../state/save-import-status.svelte.ts';
  import type { TreeView } from '../state/tree-view.svelte.ts';

  let {
    view,
    saveImport,
    onclose,
  }: { view: TreeView; saveImport: SaveImport; onclose: () => void } = $props();

  const book = $derived(view.campaigns);
  let newName = $state('');
  let renaming = $state<string | null>(null);
  let renameTo = $state('');
  let confirmingRemoval = $state<string | null>(null);
  let fileMessage = $state<string | null>(null);
  let tierToMark = $state(1);
  let areaToMark = $state<ResearchArea | 'all'>('all');

  const tiers = $derived(
    view.tree.columns().flatMap((column) => (column.kind === 'tier' ? [column.tier] : [])),
  );

  function createCampaign(): void {
    book.create(newName.trim() || `Campaign ${book.campaigns.length + 1}`);
    newName = '';
  }

  function startRenaming(id: string, name: string): void {
    renaming = id;
    renameTo = name;
  }

  function finishRenaming(): void {
    if (renaming) book.rename(renaming, renameTo);
    renaming = null;
  }

  function exportActive(): void {
    const campaign = book.active;
    if (!campaign) return;
    const url = URL.createObjectURL(
      new Blob([campaignToFile(campaign)], { type: 'application/json' }),
    );
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: `${campaign.name.replace(/[^\w -]+/g, '')}.campaign.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCampaignFile(event: Event): Promise<void> {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const campaign = book.adopt(campaignFromFile(await file.text()));
      fileMessage = `Imported "${campaign.name}".`;
    } catch (error) {
      fileMessage = error instanceof Error ? error.message : String(error);
    }
  }

  function importSaveFile(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) void saveImport.start(file);
  }

  function markTier(): void {
    view.markWholeTier(tierToMark, areaToMark === 'all' ? null : areaToMark);
  }
</script>

<aside class="campaigns" aria-label="Campaigns">
  <header>
    <h2>Campaigns</h2>
    <button class="close" onclick={onclose} aria-label="Close campaigns">×</button>
  </header>

  <ul class="list">
    <li>
      <label>
        <input
          type="radio"
          name="campaign"
          checked={book.activeId === null}
          onchange={() => book.select(null)}
        />
        <span>No campaign - just browse</span>
      </label>
    </li>
    {#each book.campaigns as campaign (campaign.id)}
      <li>
        {#if renaming === campaign.id}
          <form class="row" onsubmit={(event) => (event.preventDefault(), finishRenaming())}>
            <input id="rename-{campaign.id}" bind:value={renameTo} aria-label="New name" />
            <button type="submit">Save</button>
          </form>
        {:else}
          <label>
            <input
              type="radio"
              name="campaign"
              checked={book.activeId === campaign.id}
              onchange={() => book.select(campaign.id)}
            />
            <span>{campaign.name}</span>
            <span class="count">{Object.keys(campaign.researched).length} researched</span>
          </label>
          <div class="row actions">
            {#if confirmingRemoval === campaign.id}
              <span class="warning">Delete for good?</span>
              <button
                class="danger"
                onclick={() => (book.remove(campaign.id), (confirmingRemoval = null))}
                >Delete</button
              >
              <button onclick={() => (confirmingRemoval = null)}>Keep</button>
            {:else}
              <button onclick={() => startRenaming(campaign.id, campaign.name)}>Rename</button>
              <button onclick={() => (confirmingRemoval = campaign.id)}>Delete</button>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <form class="row" onsubmit={(event) => (event.preventDefault(), createCampaign())}>
    <input
      id="new-campaign"
      bind:value={newName}
      placeholder="New campaign name"
      aria-label="New campaign name"
    />
    <button type="submit">Create</button>
  </form>

  <section>
    <h3>Import</h3>
    <label class="file">
      <span>From a save file (.sav)</span>
      <input id="save-file" type="file" accept=".sav" onchange={importSaveFile} />
    </label>
    <p class="hint">
      Or drop a save anywhere on the page. It is read in your browser and never uploaded.
    </p>
    {#if saveImport.message}<p class="status" class:warning={saveImport.failed}>
        {saveImport.message}
      </p>{/if}
    <label class="file">
      <span>From a campaign file</span>
      <input id="campaign-file" type="file" accept=".json" onchange={importCampaignFile} />
    </label>
    {#if fileMessage}<p class="status">{fileMessage}</p>{/if}
  </section>

  {#if book.active}
    <section>
      <h3>{book.active.name}</h3>
      <div class="row">
        <button onclick={exportActive}>Export to a file</button>
        <label class="toggle">
          <input type="checkbox" bind:checked={book.hideResearched} />
          Hide researched
        </label>
      </div>
      <div class="row">
        <span>Mark all of</span>
        <select id="mark-tier" bind:value={tierToMark} aria-label="Tier">
          {#each tiers as tier (tier)}<option value={tier}>Tier {tier}</option>{/each}
        </select>
        <select id="mark-area" bind:value={areaToMark} aria-label="Research area">
          <option value="all">all areas</option>
          {#each RESEARCH_AREAS as area (area)}<option value={area}>{areaTitle(area)}</option
            >{/each}
        </select>
        <button onclick={markTier}>Mark</button>
      </div>
    </section>
  {/if}
</aside>

<style>
  .campaigns {
    position: absolute;
    right: 1rem;
    top: 3.6rem;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    width: min(440px, calc(100vw - 2rem));
    max-height: calc(100vh - 5rem);
    overflow-y: auto;
    padding: 1rem 1.1rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 12px 40px #000a;
  }

  header {
    display: flex;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  h3 {
    margin: 0 0 0.4rem;
    color: var(--text-muted);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .close {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 1.3rem;
    cursor: pointer;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list li {
    padding: 0.4rem 0;
    border-top: 1px solid #ffffff0d;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .count {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 0.8rem;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.3rem;
  }

  .actions {
    padding-left: 1.6rem;
  }

  button,
  select,
  input:not([type]),
  input[type='file'] {
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel-raised);
    color: var(--text);
    font: inherit;
    font-size: 0.85rem;
  }

  button {
    cursor: pointer;
  }

  input:not([type]) {
    flex: 1;
    min-width: 0;
    background: var(--space);
  }

  .file {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    margin-top: 0.4rem;
  }

  .hint {
    margin: 0.3rem 0 0;
    color: var(--text-faint);
    font-size: 0.75rem;
  }

  .status {
    margin: 0.3rem 0 0;
    color: var(--researched);
    font-size: 0.85rem;
  }

  .warning {
    color: var(--warning);
  }

  .danger {
    border-color: var(--penalty);
    color: var(--penalty);
  }

  .toggle {
    margin-left: auto;
  }

  input[type='radio'],
  input[type='checkbox'] {
    accent-color: var(--researched);
  }
</style>
